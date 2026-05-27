function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parsePath(path) {
  if (typeof path !== 'string') return [];
  const parts = path.split('.');
  if (parts.length === 0 || parts.some((part) => part === '')) return [];
  return parts;
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function cloneState(state) {
  return isObject(state) ? cloneJson(state) : {};
}

function getStateValue(state, path) {
  const parts = parsePath(path);
  if (parts.length === 0) return undefined;

  return parts.reduce((current, part) => {
    if (!isObject(current) || !Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined;
    }
    return current[part];
  }, state);
}

function hasStateValue(state, path) {
  const parts = parsePath(path);
  if (parts.length === 0) return false;

  let current = state;
  for (let index = 0; index < parts.length; index += 1) {
    if (!isObject(current) || !Object.prototype.hasOwnProperty.call(current, parts[index])) {
      return false;
    }
    current = current[parts[index]];
  }
  return true;
}

function setStateValue(state, path, value) {
  const parts = parsePath(path);
  const nextState = cloneState(state);
  if (parts.length === 0) return nextState;

  let current = nextState;
  parts.slice(0, -1).forEach((part) => {
    if (!isObject(current[part])) current[part] = {};
    current = current[part];
  });
  current[parts[parts.length - 1]] = cloneJson(value);
  return nextState;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cloneState,
    getStateValue,
    hasStateValue,
    setStateValue
  };
}
