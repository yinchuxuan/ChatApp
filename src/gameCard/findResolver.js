const { matchesPredicate } = require('./predicate');
const { getStateValue, hasStateValue, setStateValue, deleteStateValue } = require('./statePaths');

function normalizeFind(find) {
  if (Array.isArray(find)) return find;
  if (!find || typeof find !== 'object') return [];
  return Object.entries(find).map(([name, spec]) => ({
    name,
    from: spec.predicate,
    many: true,
    join: spec.join
  }));
}

function selectValue(message, select = 'content') {
  if (select === '_meta.source') return message?._meta?.source || '';
  return message?.[select] || '';
}

function applyMatch(value, match) {
  if (!match?.regex) return String(value ?? '');
  const found = String(value ?? '').match(new RegExp(match.regex));
  if (!found) return '';
  const group = match.group === undefined ? (found.length > 1 ? 1 : 0) : Number(match.group);
  return found[group] !== undefined ? found[group] : '';
}

function resolveFindSpec(spec, messages) {
  const matched = messages
    .filter((message, index) => matchesPredicate(spec.from || spec.predicate, message, index, messages))
    .map((message) => applyMatch(selectValue(message, spec.select), spec.match));
  const values = matched.filter((value) => value !== '');
  if (spec.many) return values.length > 0 ? values : spec.default ?? [];
  return values.length > 0 ? values[0] : spec.default ?? null;
}

function resolveFind(find, messages = []) {
  return normalizeFind(find).reduce((result, spec) => {
    if (spec?.name) result[spec.name] = resolveFindSpec(spec, messages);
    return result;
  }, {});
}

function restoreTempFind(state, previous) {
  if (previous.exists) return setStateValue(state, 'temp.find', previous.value);
  return deleteStateValue(state, 'temp.find');
}

function withFindState(state = {}, find, messages = []) {
  const previous = {
    exists: hasStateValue(state, 'temp.find'),
    value: getStateValue(state, 'temp.find')
  };
  const values = resolveFind(find, messages);
  const base = previous.exists && previous.value && typeof previous.value === 'object' && !Array.isArray(previous.value)
    ? previous.value
    : {};
  return {
    state: setStateValue(state, 'temp.find', { ...base, ...values }),
    restore: (nextState) => restoreTempFind(nextState, previous),
    values
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeFind, resolveFind, withFindState };
}
