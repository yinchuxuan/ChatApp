function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function isString(value) { return typeof value === 'string'; }
function addError(errors, path, message) { errors.push(`${path}: ${message}`); }

function validateMatch(match, path, errors) {
  if (match === undefined) return;
  if (!isObject(match)) return addError(errors, path, 'must be an object');
  Object.keys(match).forEach((key) => {
    if (!['regex', 'group'].includes(key)) addError(errors, path, 'unknown match key: ' + key);
  });
  if (!isString(match.regex) || match.regex.length === 0) addError(errors, path + '.regex', 'must be a non-empty string');
  if (match.group !== undefined && !Number.isInteger(match.group)) addError(errors, path + '.group', 'must be an integer');
}

function validateFindList(find, path, errors, validatePredicate) {
  if (!Array.isArray(find) || find.length === 0) return addError(errors, path, 'must be a non-empty array');
  find.forEach((spec, index) => {
    const specPath = `${path}[${index}]`;
    if (!isObject(spec)) return addError(errors, specPath, 'must be an object');
    Object.keys(spec).forEach((key) => {
      if (!['name', 'from', 'select', 'match', 'many', 'join', 'default'].includes(key)) addError(errors, specPath, 'unknown find key: ' + key);
    });
    if (!isString(spec.name) || spec.name.length === 0) addError(errors, specPath + '.name', 'must be a non-empty string');
    if (!spec.from) addError(errors, specPath + '.from', 'is required');
    else validatePredicate(spec.from, specPath + '.from', errors);
    if (spec.select !== undefined && !['content', 'thinking', 'role', '_meta.source'].includes(spec.select)) {
      addError(errors, specPath + '.select', 'must be content, thinking, role, or _meta.source');
    }
    validateMatch(spec.match, specPath + '.match', errors);
    if (spec.many !== undefined && typeof spec.many !== 'boolean') addError(errors, specPath + '.many', 'must be a boolean');
    if (spec.join !== undefined && !isString(spec.join)) addError(errors, specPath + '.join', 'must be a string');
  });
}

function validateFind(find, path, errors, validatePredicate) {
  if (find === undefined) return;
  return validateFindList(find, path, errors, validatePredicate);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateFind };
}
