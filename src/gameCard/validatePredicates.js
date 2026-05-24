const VALID_PHASES = ['pre_send', 'after_response'];
const VALID_ANCHORS = ['before', 'after'];
const VALID_ROLES = ['user', 'assistant', 'system'];
const VALID_ACTION_TYPES = ['insert', 'remove', 'replace', 'exec'];
const VALID_VISIBILITIES = ['llm_only', 'user_visible', 'debug_only'];
const VALID_COMPARISON_OPS = ['gt', 'gte', 'lt', 'lte', 'eq'];
const VALID_STRING_OPS = ['contains', 'regex', 'in', 'nin'];

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function isString(v) { return typeof v === 'string'; }
function isInteger(v) { return typeof v === 'number' && Number.isInteger(v); }
function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function validateTTL(value, path, errors) {
  if (!isInteger(value) || value < -1) addError(errors, path, 'ttl must be an integer >= -1');
}

function validateMessageMeta(meta, path, errors) {
  if (!isObject(meta)) return;
  if (meta.source !== undefined && !isString(meta.source)) addError(errors, path + '.source', 'must be a string');
  if (meta.visibility !== undefined && !VALID_VISIBILITIES.includes(meta.visibility)) addError(errors, path + '.visibility', 'must be one of ' + VALID_VISIBILITIES.join(', '));
}

function validateMessageRole(role, path, errors) {
  if (!VALID_ROLES.includes(role)) addError(errors, path, 'must be one of ' + VALID_ROLES.join(', '));
}

function validateComparison(value, path, errors) {
  if (!isObject(value)) return;
  for (const [op, v] of Object.entries(value)) {
    if (!VALID_COMPARISON_OPS.includes(op)) {
      addError(errors, path, 'unknown comparison op: ' + op);
    } else if (!isInteger(v) || v < 0) {
      addError(errors, path + '.' + op, 'must be a non-negative integer');
    }
  }
}

function validateStringMatcher(value, path, errors) {
  if (!isObject(value)) return;
  for (const [op, v] of Object.entries(value)) {
    if (!VALID_STRING_OPS.includes(op)) {
      addError(errors, path, 'unknown string op: ' + op);
    } else if (op === 'in' || op === 'nin') {
      if (!Array.isArray(v) || v.length === 0) addError(errors, path + '.' + op, 'must be a non-empty array');
    } else if (!isString(v)) {
      addError(errors, path + '.' + op, 'must be a string');
    }
  }
}

function validateStringSetMatcher(value, path, errors) {
  if (!isObject(value)) return;
  for (const [op, v] of Object.entries(value)) {
    if (op !== 'in' && op !== 'nin') {
      addError(errors, path, 'invalid op for role: only in/nin are allowed');
    } else if (!Array.isArray(v) || v.length === 0) {
      addError(errors, path + '.' + op, 'must be a non-empty array');
    }
  }
}

function validatePredicate(predicate, path, errors) {
  if (!predicate || !isObject(predicate)) {
    addError(errors, path, 'must be an object');
    return;
  }

  if (Object.keys(predicate).length === 0) {
    addError(errors, path, 'must have at least one key');
    return;
  }

  for (const [key, value] of Object.entries(predicate)) {
    switch (key) {
      case 'role': {
        if (isString(value)) {
          validateMessageRole(value, path + '.role', errors);
        } else {
          validateStringSetMatcher(value, path + '.role', errors);
        }
        break;
      }
      case 'content':
      case 'thinking': {
        if (!isString(value)) {
          validateStringMatcher(value, path + '.' + key, errors);
        }
        break;
      }
      case '_meta.source': {
        if (!isString(value)) {
          validateStringMatcher(value, path + '._meta.source', errors);
        }
        break;
      }
      case 'index': {
        if (!isInteger(value) && value !== 'last') {
          addError(errors, path + '.index', 'must be a non-negative integer or "last"');
        }
        break;
      }
      case 'all': {
        if (value !== true) addError(errors, path + '.all', 'must be true');
        break;
      }
      case 'exec': {
        if (!isString(value) || value.length === 0) addError(errors, path + '.exec', 'must be a non-empty string');
        break;
      }
      case 'or': {
        if (!Array.isArray(value) || value.length === 0) {
          addError(errors, path + '.or', 'must be a non-empty array');
        } else {
          value.forEach((item, i) => validatePredicate(item, path + '.or[' + i + ']', errors));
        }
        break;
      }
      case 'not': {
        validatePredicate(value, path + '.not', errors);
        break;
      }
      default: {
        addError(errors, path, 'unknown predicate key: ' + key);
      }
    }
  }
}

function validateWhen(when, path, errors) {
  if (!when || !isObject(when)) {
    addError(errors, path, 'must be an object');
    return;
  }

  if (when.phase === undefined) {
    addError(errors, path + '.phase', 'is required');
  } else if (!VALID_PHASES.includes(when.phase)) {
    addError(errors, path + '.phase', 'must be one of ' + VALID_PHASES.join(', '));
  }

  if (when.length !== undefined) {
    if (isInteger(when.length) && when.length < 0) {
      addError(errors, path + '.length', 'must be non-negative');
    } else if (isObject(when.length)) {
      validateComparison(when.length, path + '.length', errors);
    }
  }

  if (when.last !== undefined) validatePredicate(when.last, path + '.last', errors);
  if (when.any !== undefined) validatePredicate(when.any, path + '.any', errors);
  if (when.all !== undefined) validatePredicate(when.all, path + '.all', errors);
}

function validateAction(action, path, errors) {
  if (!action || !isObject(action)) {
    addError(errors, path, 'must be an object');
    return;
  }

  if (!VALID_ACTION_TYPES.includes(action.type)) {
    addError(errors, path + '.type', 'must be one of ' + VALID_ACTION_TYPES.join(', '));
    return;
  }

  switch (action.type) {
    case 'insert': {
      if (!action.predicate) addError(errors, path, 'requires predicate');
      else validatePredicate(action.predicate, path + '.predicate', errors);
      if (!action.role) addError(errors, path, 'requires role');
      else validateMessageRole(action.role, path + '.role', errors);
      if (!isString(action.content)) addError(errors, path + '.content', 'must be a string');
      if (action.anchor !== undefined && !VALID_ANCHORS.includes(action.anchor)) {
        addError(errors, path + '.anchor', 'must be one of ' + VALID_ANCHORS.join(', '));
      }
      if (action.ttl !== undefined) validateTTL(action.ttl, path + '.ttl', errors);
      if (action._meta !== undefined) validateMessageMeta(action._meta, path + '._meta', errors);
      break;
    }
    case 'remove': {
      if (!action.predicate) addError(errors, path, 'requires predicate');
      else validatePredicate(action.predicate, path + '.predicate', errors);
      break;
    }
    case 'replace': {
      if (!action.predicate) addError(errors, path, 'requires predicate');
      else validatePredicate(action.predicate, path + '.predicate', errors);
      if (action.content === undefined && action.ttl === undefined) {
        addError(errors, path, 'requires content or ttl');
      }
      if (action.content !== undefined && !isString(action.content)) {
        addError(errors, path + '.content', 'must be a string');
      }
      if (action.ttl !== undefined) validateTTL(action.ttl, path + '.ttl', errors);
      if (action._meta !== undefined) validateMessageMeta(action._meta, path + '._meta', errors);
      break;
    }
    case 'exec': {
      if (!isString(action.source) || action.source.length === 0) {
        addError(errors, path + '.source', 'must be a non-empty string');
      }
      break;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validatePredicate, validateWhen, validateAction, validateTTL, validateMessageMeta, validateMessageRole };
}
