const VALID_PHASES = ['init', 'pre_send', 'after_response'];
const VALID_ANCHORS = ['before', 'after'];
const VALID_ROLES = ['user', 'assistant', 'system'];
const VALID_ACTION_TYPES = ['insert', 'remove', 'replace', 'exec', 'state.set', 'state.delete', 'state.append', 'state.remove'];
const VALID_VISIBILITIES = ['llm_only', 'user_visible', 'debug_only'];
const VALID_COMPARISON_OPS = ['gt', 'gte', 'lt', 'lte', 'eq'];
const VALID_STRING_OPS = ['contains', 'regex', 'in', 'nin'];
const VALID_STATE_OPS = ['eq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'contains', 'exists', 'regex'];
function addError(errors, path, message) { errors.push(`${path}: ${message}`); }
function isString(v) { return typeof v === 'string'; }
function isInteger(v) { return typeof v === 'number' && Number.isInteger(v); }
function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function isStateLiteral(v) { return v === null || ['string', 'number', 'boolean'].includes(typeof v); }
function validateTTL(value, path, errors) {
  if (!isInteger(value) || value < -1) addError(errors, path, 'ttl must be an integer >= -1');
}
function validateMessageMeta(meta, path, errors) {
  if (!isObject(meta)) return;
  if (meta.source !== undefined && !isString(meta.source)) addError(errors, path + '.source', 'must be a string');
  if (meta.visibility !== undefined && !VALID_VISIBILITIES.includes(meta.visibility)) addError(errors, path + '.visibility', 'must be one of ' + VALID_VISIBILITIES.join(', '));
}
function validateMessageRole(role, path, errors) { if (!VALID_ROLES.includes(role)) addError(errors, path, 'must be one of ' + VALID_ROLES.join(', ')); }
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
function validateStateMatcher(value, path, errors) {
  if (!isObject(value)) return;
  for (const [op, v] of Object.entries(value)) {
    if (!VALID_STATE_OPS.includes(op)) addError(errors, path, 'unknown state op: ' + op);
    else if (['gt', 'gte', 'lt', 'lte'].includes(op) && typeof v !== 'number') addError(errors, path + '.' + op, 'must be a number');
    else if ((op === 'in' || op === 'nin') && (!Array.isArray(v) || v.length === 0)) addError(errors, path + '.' + op, 'must be a non-empty array');
    else if (op === 'exists' && typeof v !== 'boolean') addError(errors, path + '.exists', 'must be a boolean');
    else if (op === 'regex' && !isString(v)) addError(errors, path + '.regex', 'must be a string');
  }
}
function validateStatePredicate(predicate, path, errors) {
  if (!isObject(predicate) || Object.keys(predicate).length === 0) return addError(errors, path, 'must be a non-empty object');
  Object.entries(predicate).forEach(([key, value]) => {
    if (!isString(key) || key.length === 0) addError(errors, path, 'state path must be a non-empty string');
    if (isObject(value)) validateStateMatcher(value, path + '.' + key, errors);
    else if (!isStateLiteral(value)) addError(errors, path + '.' + key, 'must be a scalar or state matcher');
  });
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
        if (isString(value)) validateMessageRole(value, path + '.role', errors);
        else validateStringSetMatcher(value, path + '.role', errors);
        break;
      }
      case 'content':
      case 'thinking': {
        if (!isString(value)) validateStringMatcher(value, path + '.' + key, errors);
        break;
      }
      case '_meta.source': {
        if (!isString(value)) validateStringMatcher(value, path + '._meta.source', errors);
        break;
      }
      case 'index': {
        if (!isInteger(value) && value !== 'last') addError(errors, path + '.index', 'must be a non-negative integer or "last"');
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
        if (!Array.isArray(value) || value.length === 0) addError(errors, path + '.or', 'must be a non-empty array');
        else value.forEach((item, i) => validatePredicate(item, path + '.or[' + i + ']', errors));
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

function validateLastPredicate(predicate, path, errors) {
  if (predicate?.num === undefined) return validatePredicate(predicate, path, errors);
  if (!isInteger(predicate.num) || predicate.num < 1) addError(errors, path + '.num', 'must be a positive integer');
  const rest = { ...predicate };
  delete rest.num;
  if (Object.keys(rest).length === 0) addError(errors, path, 'requires predicate keys besides num');
  else validatePredicate(rest, path, errors);
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
  if (when.last !== undefined) validateLastPredicate(when.last, path + '.last', errors);
  if (when.any !== undefined) validatePredicate(when.any, path + '.any', errors);
  if (when.all !== undefined) validatePredicate(when.all, path + '.all', errors);
  if (when.state !== undefined) validateStatePredicate(when.state, path + '.state', errors);
}

function validateFindMap(find, path, errors) {
  if (find === undefined) return;
  if (!isObject(find) || Object.keys(find).length === 0) return addError(errors, path, 'must be a non-empty object');
  Object.entries(find).forEach(([name, spec]) => {
    const specPath = `${path}.${name}`;
    if (!isObject(spec)) return addError(errors, specPath, 'must be an object');
    if (!spec.predicate) addError(errors, specPath, 'requires predicate');
    else validatePredicate(spec.predicate, specPath + '.predicate', errors);
    if (spec.join !== undefined && !isString(spec.join)) addError(errors, specPath + '.join', 'must be a string');
    Object.keys(spec).forEach((key) => {
      if (!['predicate', 'join'].includes(key)) addError(errors, specPath, 'unknown find key: ' + key);
    });
  });
}
function validateRequiredPredicate(action, path, errors) {
  if (!action.predicate) addError(errors, path, 'requires predicate');
  else validatePredicate(action.predicate, path + '.predicate', errors);
}
function validateAction(action, path, errors) {
  if (!action || !isObject(action)) return addError(errors, path, 'must be an object');
  if (!VALID_ACTION_TYPES.includes(action.type)) {
    return addError(errors, path + '.type', 'must be one of ' + VALID_ACTION_TYPES.join(', '));
  }
  if (action.type === 'exec') {
    if (!isString(action.source) || action.source.length === 0) addError(errors, path + '.source', 'must be a non-empty string');
    return;
  }
  if (action.type.startsWith('state.')) return;
  if (action.type !== 'insert') validateRequiredPredicate(action, path, errors);
  if (action.type === 'insert' && action.predicate !== undefined) validatePredicate(action.predicate, path + '.predicate', errors);
  if (action.type === 'remove') return;
  if (action.type === 'insert') {
    if (!action.role) addError(errors, path, 'requires role');
    else validateMessageRole(action.role, path + '.role', errors);
    if (!isString(action.content)) addError(errors, path + '.content', 'must be a string');
    if (action.anchor !== undefined && !VALID_ANCHORS.includes(action.anchor)) addError(errors, path + '.anchor', 'must be one of ' + VALID_ANCHORS.join(', '));
  }
  if (action.type === 'replace' && action.content === undefined && action.ttl === undefined) addError(errors, path, 'requires content or ttl');
  if (action.type === 'replace' && action.content !== undefined && !isString(action.content)) addError(errors, path + '.content', 'must be a string');
  if (action.ttl !== undefined) validateTTL(action.ttl, path + '.ttl', errors);
  if (action._meta !== undefined) validateMessageMeta(action._meta, path + '._meta', errors);
  validateFindMap(action.find, path + '.find', errors);
}
if (typeof module !== 'undefined' && module.exports) module.exports = { validatePredicate, validateWhen, validateAction, validateTTL, validateMessageMeta, validateMessageRole, validateStatePredicate };
