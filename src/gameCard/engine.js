const { applyActions } = require('./actions');
const { matchesWhen } = require('./predicate');
const { validateGameCard } = require('./validateGameCard');

function cloneMessage(message) {
  return {
    ...message,
    ...(message?._meta ? { _meta: { ...message._meta } } : {})
  };
}

function cloneMessages(messages) {
  return Array.isArray(messages) ? messages.map(cloneMessage) : [];
}

function applyMatchingRule(messages, rule, index) {
  const applied = applyActions(messages, rule.then || []);
  return {
    messages: applied.messages,
    trace: {
      ruleIndex: index,
      ruleId: rule.id,
      matched: true,
      actions: applied.trace
    }
  };
}

function applyGameCard({ card, phase, messages = [] } = {}) {
  const validation = validateGameCard(card);
  const initialMessages = cloneMessages(messages);
  const trace = {
    phase,
    rules: [],
    errors: validation.errors
  };

  if (!validation.valid) {
    return { messages: initialMessages, state: {}, trace };
  }

  const result = card.rules.reduce((current, rule, index) => {
    if (!matchesWhen(rule.when, phase, current.messages)) return current;

    const applied = applyMatchingRule(current.messages, rule, index);
    return {
      messages: applied.messages,
      trace: {
        ...current.trace,
        rules: [...current.trace.rules, applied.trace]
      }
    };
  }, { messages: initialMessages, trace });

  return {
    messages: result.messages,
    state: {},
    trace: result.trace
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyGameCard, cloneMessages };
}
