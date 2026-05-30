const {
  cloneState,
  deleteStateValue,
  getStateValue,
  hasStateValue,
  setStateValue
} = require('./statePaths');
const { validateStatePathValue } = require('./stateSchema');

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isValidPath(path) {
  if (typeof path !== 'string' || path.length === 0) return false;
  return path.split('.').every((part) => part.length > 0 && !part.includes('[') && !part.includes(']'));
}

function isJsonValue(value) {
  if (value === null) return true;
  if (['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isObject(value)) return false;
  return Object.values(value).every(isJsonValue);
}

function deepEqual(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) return deepEqualArray(left, right);
  if (isObject(left) || isObject(right)) return deepEqualObject(left, right);
  return false;
}

function deepEqualArray(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((value, index) => deepEqual(value, right[index]));
}

function deepEqualObject(left, right) {
  if (!isObject(left) || !isObject(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && deepEqual(left[key], right[key]));
}

function getMessageCount(options) {
  if (Array.isArray(options.messages)) return options.messages.length;
  return Number.isInteger(options.messageCount) ? options.messageCount : 0;
}

function buildTrace(type, applied, reason, changedKeys, options) {
  const messageCount = getMessageCount(options);
  return {
    type,
    applied,
    matched: applied ? 1 : 0,
    ...(reason ? { reason } : {}),
    summary: {
      messages: { before: messageCount, after: messageCount, inserted: 0, removed: 0, replaced: 0 },
      state: { changedKeys }
    }
  };
}

function finish(type, before, after, path, options) {
  const changedKeys = deepEqual(getStateValue(before, path), getStateValue(after, path)) ? [] : [path];
  return { state: after, trace: buildTrace(type, true, null, changedKeys, options) };
}

function fail(type, state, reason, options) {
  return { state: cloneState(state), trace: buildTrace(type, false, reason, [], options) };
}

function requireValue(action) {
  return Object.prototype.hasOwnProperty.call(action || {}, 'value') && isJsonValue(action.value);
}

function parseDice(dice) {
  const match = String(dice || '').match(/^([1-9]\d*)?d([1-9]\d*)$/i);
  if (!match) return null;
  return { count: Number(match[1] || 1), sides: Number(match[2]) };
}

function rollDice(dice) {
  const parsed = parseDice(dice);
  if (!parsed) return null;
  return Array.from({ length: parsed.count }).reduce((sum) => {
    return sum + Math.floor(Math.random() * parsed.sides) + 1;
  }, 0);
}

function randomInt(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) return null;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function validateNextState(type, before, after, path, options) {
  if (!options.schema || !hasStateValue(after, path)) return finish(type, before, after, path, options);

  const validation = validateStatePathValue(options.schema, path, getStateValue(after, path));
  if (!validation.hit) return finish(type, before, after, path, options);
  if (validation.error) return fail(type, before, `schema.${path}: ${validation.error}`, options);
  if (!validation.changed) return finish(type, before, after, path, options);
  return finish(type, before, setStateValue(after, path, validation.value), path, options);
}

function applySet(state, action, options) {
  if (!requireValue(action)) return fail(action?.type, state, 'invalid_value', options);
  const nextState = setStateValue(state, action.path, action.value);
  return validateNextState(action.type, state, nextState, action.path, options);
}

function applyDelete(state, action, options) {
  const nextState = deleteStateValue(state, action.path);
  return finish(action.type, state, nextState, action.path, options);
}

function applyAppend(state, action, options) {
  if (!requireValue(action)) return fail(action?.type, state, 'invalid_value', options);
  if (!hasStateValue(state, action.path)) {
    const nextState = setStateValue(state, action.path, [action.value]);
    return validateNextState(action.type, state, nextState, action.path, options);
  }

  const current = getStateValue(state, action.path);
  if (!Array.isArray(current)) return fail(action.type, state, 'target_not_array', options);
  const nextState = setStateValue(state, action.path, [...current, action.value]);
  return validateNextState(action.type, state, nextState, action.path, options);
}

function applyRemove(state, action, options) {
  if (!requireValue(action)) return fail(action?.type, state, 'invalid_value', options);
  if (!hasStateValue(state, action.path)) return finish(action.type, state, cloneState(state), action.path, options);

  const current = getStateValue(state, action.path);
  if (!Array.isArray(current)) return fail(action.type, state, 'target_not_array', options);
  const nextArray = current.filter((item) => !deepEqual(item, action.value));
  const nextState = setStateValue(state, action.path, nextArray);
  return validateNextState(action.type, state, nextState, action.path, options);
}

function applyRoll(state, action, options) {
  const value = rollDice(action.dice);
  if (value === null) return fail(action?.type, state, 'invalid_dice', options);
  const nextState = setStateValue(state, action.path, value);
  return validateNextState(action.type, state, nextState, action.path, options);
}

function applyRandomInt(state, action, options) {
  const value = randomInt(action.min, action.max);
  if (value === null) return fail(action?.type, state, 'invalid_range', options);
  const nextState = setStateValue(state, action.path, value);
  return validateNextState(action.type, state, nextState, action.path, options);
}

function applyStateAction(state, action, options = {}) {
  if (!isValidPath(action?.path)) return fail(action?.type || 'unknown', state, 'invalid_path', options);
  if (action.type === 'state.set') return applySet(state, action, options);
  if (action.type === 'state.delete') return applyDelete(state, action, options);
  if (action.type === 'state.append') return applyAppend(state, action, options);
  if (action.type === 'state.remove') return applyRemove(state, action, options);
  if (action.type === 'state.roll') return applyRoll(state, action, options);
  if (action.type === 'state.randomInt') return applyRandomInt(state, action, options);
  return fail(action?.type || 'unknown', state, 'not_implemented', options);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyStateAction };
}
