const { resolveContent } = require('./contentResolver');
const { matchesPredicate } = require('./predicate');

function findMatchingIndexes(messages, predicate) {
  return messages.reduce((indexes, message, index) => {
    if (matchesPredicate(predicate, message, index, messages)) {
      return [...indexes, index];
    }
    return indexes;
  }, []);
}

function summarizeMessages(before, after, type, matched) {
  return {
    before: before.length,
    after: after.length,
    inserted: type === 'insert' && after.length > before.length ? 1 : 0,
    removed: type === 'remove' ? before.length - after.length : 0,
    replaced: type === 'replace' ? matched : 0
  };
}

function buildTrace(action, matches, applied, before, after) {
  const type = action?.type || 'unknown';
  return {
    type,
    applied,
    matched: matches.length,
    summary: {
      messages: summarizeMessages(before, after, type, matches.length),
      state: { changedKeys: [] }
    }
  };
}

function insertMessage(action) {
  return {
    role: action.role,
    content: resolveContent(action.content),
    ...(action.ttl !== undefined ? { ttl: action.ttl } : {}),
    ...(action._meta ? { _meta: { ...action._meta } } : {})
  };
}

function applyInsert(messages, action) {
  const matches = findMatchingIndexes(messages, action.predicate);
  if (matches.length === 0) return { messages, trace: buildTrace(action, matches, false, messages, messages) };

  const anchorIndex = matches[0] + (action.anchor === 'after' ? 1 : 0);
  const nextMessages = [
    ...messages.slice(0, anchorIndex),
    insertMessage(action),
    ...messages.slice(anchorIndex)
  ];
  return { messages: nextMessages, trace: buildTrace(action, matches, true, messages, nextMessages) };
}

function applyRemove(messages, action) {
  const matches = findMatchingIndexes(messages, action.predicate);
  if (matches.length === 0) return { messages, trace: buildTrace(action, matches, false, messages, messages) };

  const nextMessages = messages.filter((_, index) => !matches.includes(index));
  return { messages: nextMessages, trace: buildTrace(action, matches, true, messages, nextMessages) };
}

function applyReplace(messages, action) {
  const matches = findMatchingIndexes(messages, action.predicate);
  if (matches.length === 0) return { messages, trace: buildTrace(action, matches, false, messages, messages) };

  const nextMessages = messages.map((message, index) => {
    if (!matches.includes(index)) return message;
    return {
      ...message,
      ...(action.content !== undefined ? { content: resolveContent(action.content, message) } : {}),
      ...(action.ttl !== undefined ? { ttl: action.ttl } : {}),
      ...(action._meta ? { _meta: { ...message._meta, ...action._meta } } : {})
    };
  });
  return { messages: nextMessages, trace: buildTrace(action, matches, true, messages, nextMessages) };
}

function applyAction(messages, action) {
  if (action?.type === 'insert') return applyInsert(messages, action);
  if (action?.type === 'remove') return applyRemove(messages, action);
  if (action?.type === 'replace') return applyReplace(messages, action);

  return {
    messages,
    trace: {
      type: action?.type || 'unknown',
      applied: false,
      reason: 'not_implemented',
      summary: {
        messages: summarizeMessages(messages, messages, 'unknown', 0),
        state: { changedKeys: [] }
      }
    }
  };
}

function applyActions(messages, actions = []) {
  return actions.reduce((result, action) => {
    const next = applyAction(result.messages, action);
    return {
      messages: next.messages,
      trace: [...result.trace, next.trace]
    };
  }, { messages, trace: [] });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyAction, applyActions };
}
