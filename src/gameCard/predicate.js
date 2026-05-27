const { getStateValue, hasStateValue } = require('./statePaths');

function compareNumber(actual, expected) {
  if (typeof expected === 'number') return actual === expected;
  if (!expected || typeof expected !== 'object') return false;

  return Object.entries(expected).every(([op, value]) => {
    if (op === 'gt') return actual > value;
    if (op === 'gte') return actual >= value;
    if (op === 'lt') return actual < value;
    if (op === 'lte') return actual <= value;
    if (op === 'eq') return actual === value;
    return false;
  });
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function matchesStateOperator(actual, exists, op, expected) {
  if (op === 'exists') return expected === exists;
  if (!exists) return false;
  if (op === 'eq') return actual === expected;
  if (op === 'gt') return typeof actual === 'number' && actual > expected;
  if (op === 'gte') return typeof actual === 'number' && actual >= expected;
  if (op === 'lt') return typeof actual === 'number' && actual < expected;
  if (op === 'lte') return typeof actual === 'number' && actual <= expected;
  if (op === 'in') return Array.isArray(expected) && expected.includes(actual);
  if (op === 'nin') return Array.isArray(expected) && !expected.includes(actual);
  if (op === 'contains' && typeof actual === 'string') return actual.includes(expected);
  if (op === 'contains' && Array.isArray(actual)) return actual.includes(expected);
  if (op === 'regex' && typeof actual === 'string') {
    try {
      return new RegExp(expected).test(actual);
    } catch {
      return false;
    }
  }
  return false;
}

function matchesStateValue(state, path, expected) {
  const exists = hasStateValue(state, path);
  const actual = getStateValue(state, path);
  if (!isObject(expected)) return exists && actual === expected;

  return Object.entries(expected).every(([op, value]) => {
    return matchesStateOperator(actual, exists, op, value);
  });
}

function matchesState(statePredicate, state) {
  if (!isObject(statePredicate) || Object.keys(statePredicate).length === 0) {
    return false;
  }
  return Object.entries(statePredicate).every(([path, expected]) => {
    return matchesStateValue(state, path, expected);
  });
}

function getValue(message, key) {
  if (key === '_meta.source') return message?._meta?.source;
  if (key === '_meta.visibility') return message?._meta?.visibility;
  return message?.[key];
}

function matchesString(actual, expected) {
  if (typeof expected === 'string') return actual === expected;
  if (typeof actual !== 'string' || !expected || typeof expected !== 'object') {
    return false;
  }

  return Object.entries(expected).every(([op, value]) => {
    if (op === 'contains') return actual.includes(value);
    if (op === 'regex') {
      try {
        return new RegExp(value).test(actual);
      } catch {
        return false;
      }
    }
    if (op === 'in') return Array.isArray(value) && value.includes(actual);
    if (op === 'nin') return Array.isArray(value) && !value.includes(actual);
    return false;
  });
}

function matchesIndex(index, length, expected) {
  if (expected === 'last') return index === length - 1;
  return index === expected;
}

function matchesPredicate(predicate, message, index, messages) {
  if (!predicate || typeof predicate !== 'object') return false;
  const entries = Object.entries(predicate);
  if (entries.length === 0) return false;

  return entries.every(([key, expected]) => {
    if (key === 'all') return expected === true;
    if (key === 'or') {
      return expected.some((item) => matchesPredicate(item, message, index, messages));
    }
    if (key === 'not') return !matchesPredicate(expected, message, index, messages);
    if (key === 'index') return matchesIndex(index, messages.length, expected);
    if (key === 'exec') {
      try {
        const fn = new Function('msg', 'i', 'msgs', expected);
        return !!fn(message, index, messages);
      } catch {
        return false;
      }
    }
    if (key === 'role' || key === 'content' || key === 'thinking' || key === '_meta.source' || key === '_meta.visibility') {
      return matchesString(getValue(message, key), expected);
    }
    return false;
  });
}

function withoutNum(predicate) {
  const rest = { ...(predicate || {}) };
  delete rest.num;
  return rest;
}

function matchesLast(last, messages) {
  if (!last || typeof last !== 'object') return false;
  if (last.num === undefined) {
    const index = messages.length - 1;
    return index >= 0 && matchesPredicate(last, messages[index], index, messages);
  }

  if (!Number.isInteger(last.num) || last.num < 1) return false;
  const predicate = withoutNum(last);
  if (Object.keys(predicate).length === 0) return false;
  const start = Math.max(messages.length - last.num, 0);
  return messages.slice(start).some((msg, offset) => {
    const index = start + offset;
    return matchesPredicate(predicate, msg, index, messages);
  });
}

function matchesWhen(when, phase, messages, state = {}) {
  if (!when || when.phase !== phase) return false;
  if (when.length !== undefined) {
    if (!compareNumber(messages.length, when.length)) return false;
  }
  if (when.last !== undefined) {
    if (!matchesLast(when.last, messages)) return false;
  }
  if (when.any !== undefined) {
    if (!messages.some((msg, index) => matchesPredicate(when.any, msg, index, messages))) return false;
  }
  if (when.all !== undefined) {
    if (!messages.every((msg, index) => matchesPredicate(when.all, msg, index, messages))) return false;
  }
  if (when.state !== undefined) {
    if (!matchesState(when.state, state)) return false;
  }
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compareNumber, matchesPredicate, matchesWhen, matchesLast, matchesState };
}
