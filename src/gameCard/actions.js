function applyAction(messages, action) {
  return {
    messages,
    trace: {
      type: action?.type || 'unknown',
      applied: false,
      reason: 'not_implemented'
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
