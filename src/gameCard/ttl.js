function decayTTL(messages) {
  const input = Array.isArray(messages) ? messages : [];
  const trace = {
    phase: 'ttl_decay',
    summary: {
      messages: {
        before: input.length,
        after: 0,
        decayed: 0,
        removed: 0
      },
      state: { changedKeys: [] }
    },
    errors: []
  };

  const decayed = input.reduce((kept, message) => {
    if (message?.ttl === undefined || message.ttl === -1) return [...kept, cloneMessage(message)];
    if (typeof message.ttl !== 'number' || !Number.isInteger(message.ttl)) {
      trace.errors.push('message ttl must be a number');
      return [...kept, cloneMessage(message)];
    }
    if (message.ttl <= 0) {
      trace.summary.messages.removed += 1;
      return kept;
    }
    if (message.ttl === 1) {
      trace.summary.messages.removed += 1;
      return kept;
    }

    trace.summary.messages.decayed += 1;
    return [...kept, { ...cloneMessage(message), ttl: message.ttl - 1 }];
  }, []);

  trace.summary.messages.after = decayed.length;
  return { messages: decayed, trace };
}

function cloneMessage(message) {
  return {
    ...message,
    ...(message?._meta ? { _meta: { ...message._meta } } : {})
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { decayTTL };
}
