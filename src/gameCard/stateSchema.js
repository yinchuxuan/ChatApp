const {
  cloneState,
  getStateValue,
  hasStateValue,
  setStateValue
} = require('./statePaths');

const VALID_TYPES = ['string', 'number', 'boolean', 'object', 'array', 'enum'];

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isValidPath(path) {
  return typeof path === 'string' && path.length > 0 && !path.split('.').some((part) => part === '');
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function normalizeStateSchema(input = {}) {
  const source = isObject(input?.schema) ? input.schema : input;
  const errors = [];
  if (!isObject(source)) return { schema: {}, errors: ['state schema must be an object'] };

  const schema = {};
  Object.entries(source).forEach(([path, definition]) => {
    if (!isValidPath(path)) {
      errors.push(`schema.${path}: path must be a non-empty dot path`);
      return;
    }
    if (!isObject(definition)) {
      errors.push(`schema.${path}: definition must be an object`);
      return;
    }
    if (definition.type !== undefined && !VALID_TYPES.includes(definition.type)) {
      errors.push(`schema.${path}.type: unsupported type`);
      return;
    }
    if (definition.type === 'enum' && (!Array.isArray(definition.values) || definition.values.length === 0)) {
      errors.push(`schema.${path}.values: enum requires non-empty values`);
      return;
    }
    schema[path] = { ...definition };
  });
  return { schema, errors };
}

function validateValue(value, definition) {
  if (definition.type === 'number') return validateNumber(value, definition);
  if (definition.type === 'enum') return validateEnum(value, definition);
  if (definition.type === 'string') return typeof value === 'string' ? {} : { error: 'must be a string' };
  if (definition.type === 'boolean') return typeof value === 'boolean' ? {} : { error: 'must be a boolean' };
  if (definition.type === 'object') return isObject(value) ? {} : { error: 'must be an object' };
  if (definition.type === 'array') return Array.isArray(value) ? {} : { error: 'must be an array' };
  return {};
}

function validateNumber(value, definition) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return { error: 'must be a finite number' };
  const min = typeof definition.min === 'number' ? definition.min : undefined;
  const max = typeof definition.max === 'number' ? definition.max : undefined;
  const clamped = clampNumber(value, min, max);
  if (clamped !== value && definition.onInvalid === 'clamp') return { value: clamped, changed: true };
  if (min !== undefined && value < min) return { error: `must be >= ${min}` };
  if (max !== undefined && value > max) return { error: `must be <= ${max}` };
  return {};
}

function validateEnum(value, definition) {
  return definition.values.includes(value) ? {} : { error: 'must be one of enum values' };
}

function clampNumber(value, min, max) {
  let next = value;
  if (min !== undefined && next < min) next = min;
  if (max !== undefined && next > max) next = max;
  return next;
}

function ensureStateDefaults(schemaInput, state = {}) {
  const normalized = normalizeStateSchema(schemaInput);
  let nextState = cloneState(state);
  const errors = [...normalized.errors];
  const changedKeys = [];

  Object.entries(normalized.schema).forEach(([path, definition]) => {
    if (!hasStateValue(nextState, path)) {
      applyDefault(path, definition);
      return;
    }
    validateExisting(path, definition);
  });

  function applyDefault(path, definition) {
    if (!Object.prototype.hasOwnProperty.call(definition, 'default')) return;
    const defaultValue = cloneJson(definition.default);
    const validation = validateValue(defaultValue, definition);
    if (validation.error) {
      errors.push(`schema.${path}.default: ${validation.error}`);
      return;
    }
    nextState = setStateValue(nextState, path, validation.changed ? validation.value : defaultValue);
    changedKeys.push(path);
  }

  function validateExisting(path, definition) {
    const value = getStateValue(nextState, path);
    const validation = validateValue(value, definition);
    if (validation.changed) {
      nextState = setStateValue(nextState, path, validation.value);
      changedKeys.push(path);
    } else if (validation.error) {
      errors.push(`state.${path}: ${validation.error}`);
    }
  }

  return { state: nextState, changed: changedKeys.length > 0, changedKeys, errors };
}

function validateStatePathValue(schemaInput, path, value) {
  const normalized = normalizeStateSchema(schemaInput);
  if (!Object.prototype.hasOwnProperty.call(normalized.schema, path)) {
    return { hit: false, errors: normalized.errors };
  }

  const validation = validateValue(value, normalized.schema[path]);
  return {
    hit: true,
    errors: normalized.errors,
    ...(validation.error ? { error: validation.error } : {}),
    ...(validation.changed ? { value: validation.value, changed: true } : {})
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ensureStateDefaults, normalizeStateSchema, validateStatePathValue };
}
