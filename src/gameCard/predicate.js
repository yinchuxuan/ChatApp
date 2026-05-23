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

function matchesWhen(when, phase, messages) {
  if (!when || when.phase !== phase) return false;
  if (when.length !== undefined) {
    return compareNumber(messages.length, when.length);
  }
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compareNumber, matchesWhen };
}
