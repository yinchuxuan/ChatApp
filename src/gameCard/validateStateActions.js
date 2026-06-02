const VALID_STATE_ACTION_TYPES = [
  'state.set', 'state.delete', 'state.append', 'state.remove',
  'state.roll', 'state.randomInt', 'state.advance'
];
const VALUE_ACTION_TYPES = ['state.set', 'state.append', 'state.remove'];

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isValidStatePath(path) {
  if (typeof path !== 'string' || path.length === 0) return false;
  return path.split('.').every((part) => (
    part.length > 0 && !part.includes('[') && !part.includes(']')
  ));
}

function isJsonValue(value) {
  if (value === null) return true;
  if (['string', 'boolean'].includes(typeof value)) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (!isObject(value)) return false;
  return Object.values(value).every(isJsonValue);
}

function isValidDice(dice) {
  return typeof dice === 'string' && /^([1-9]\d*)?d([1-9]\d*)$/i.test(dice);
}

function validateRoll(action, path, errors) {
  if (!isValidDice(action.dice)) addError(errors, path + '.dice', 'must be a dice expression like 1d6');
}

function validateRandomInt(action, path, errors) {
  if (!Number.isInteger(action.min)) addError(errors, path + '.min', 'must be an integer');
  if (!Number.isInteger(action.max)) addError(errors, path + '.max', 'must be an integer');
  if (Number.isInteger(action.min) && Number.isInteger(action.max) && action.min > action.max) {
    addError(errors, path + '.max', 'must be greater than or equal to min');
  }
}

function validateStateAction(action, path, errors) {
  if (!VALID_STATE_ACTION_TYPES.includes(action?.type)) {
    addError(errors, path + '.type', 'unknown state action type');
    return;
  }

  if (!isValidStatePath(action.path)) {
    addError(errors, path + '.path', 'must be a non-empty dot path');
  }

  if (action.type === 'state.roll') {
    validateRoll(action, path, errors);
    return;
  }
  if (action.type === 'state.randomInt') {
    validateRandomInt(action, path, errors);
    return;
  }

  if (!VALUE_ACTION_TYPES.includes(action.type)) return;
  if (!Object.prototype.hasOwnProperty.call(action, 'value')) {
    addError(errors, path + '.value', 'is required');
  } else if (!isJsonValue(action.value)) {
    addError(errors, path + '.value', 'must be a JSON value');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VALID_STATE_ACTION_TYPES, validateStateAction };
}
