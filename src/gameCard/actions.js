const { resolveContent } = require('./contentResolver');
const { runExecAction } = require('./execRunner');
const { matchesPredicate } = require('./predicate');
const { applyStateAction } = require('./stateActions');
const { withFindState } = require('./findResolver');

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

function buildTrace(action, matches, applied, before, after, stateSummary) {
  const type = action?.type || 'unknown';
  return {
    type,
    applied,
    matched: matches.length,
    summary: {
      messages: summarizeMessages(before, after, type, matches.length),
      state: stateSummary || { changedKeys: [] }
    }
  };
}

function insertMessage(action, options) {
  return {
    role: action.role, content: resolveContent(action.content, {}, options),
    ...(action.ttl !== undefined ? { ttl: action.ttl } : {}),
    ...(action._meta ? { _meta: { ...action._meta } } : {})
  };
}

function applyInsert(messages, action, options) {
  if (!action.role || action.content === undefined) {
    return { messages, trace: buildTrace(action, [], false, messages, messages) };
  }

  if (action.predicate === undefined) {
    const nextMessages = [...messages, insertMessage(action, options)];
    return { messages: nextMessages, trace: buildTrace(action, [], true, messages, nextMessages) };
  }

  const matches = findMatchingIndexes(messages, action.predicate);
  if (matches.length === 0) return { messages, trace: buildTrace(action, matches, false, messages, messages) };

  const anchorIndex = matches[0] + (action.anchor === 'before' ? 0 : 1);
  const nextMessages = [
    ...messages.slice(0, anchorIndex),
    insertMessage(action, options),
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

function applyReplace(messages, action, options) {
  const matches = findMatchingIndexes(messages, action.predicate);
  if (matches.length === 0) return { messages, trace: buildTrace(action, matches, false, messages, messages) };

  const nextMessages = messages.map((message, index) => {
    if (!matches.includes(index)) return message;
    return {
      ...message,
      ...(action.content !== undefined ? { content: resolveContent(action.content, message, { ...options, messages }) } : {}),
      ...(action.ttl !== undefined ? { ttl: action.ttl } : {}),
      ...(action._meta ? { _meta: { ...message._meta, ...action._meta } } : {})
    };
  });
  return { messages: nextMessages, trace: buildTrace(action, matches, true, messages, nextMessages) };
}

function applyAction(messages, action, options = {}) {
  if (action?.find) {
    const found = withFindState(options.state || {}, action.find, messages);
    const next = applyAction(messages, { ...action, find: undefined }, {
      ...options,
      state: found.state,
      find: Array.isArray(action.find) ? options.find : { ...options.find, ...action.find }
    });
    return { ...next, state: found.restore(next.state || found.state) };
  }
  if (action?.type === 'insert') return applyInsert(messages, action, { ...options, messages });
  if (action?.type === 'remove') return applyRemove(messages, action);
  if (action?.type === 'replace') return applyReplace(messages, action, options);
  if (action?.type?.startsWith('state.')) {
    const result = applyStateAction(options.state || {}, action, {
      messages,
      schema: options.card?.state?.schema
    });
    return { messages, state: result.state, trace: result.trace };
  }
  if (action?.type === 'exec') {
    return runExecAction(messages, options.state || {}, action, options);
  }

  return {
    messages,
    state: options.state || {},
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

function applyActions(messages, actions = [], options = {}) {
  return actions.reduce((result, action) => {
    const next = applyAction(result.messages, action, { ...options, state: result.state });
    return {
      messages: next.messages,
      state: next.state || result.state,
      trace: [...result.trace, next.trace]
    };
  }, { messages, state: options.state || {}, trace: [] });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyAction, applyActions };
}
