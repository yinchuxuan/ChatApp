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

function cloneState(state) {
  return state && typeof state === 'object' && !Array.isArray(state) ? { ...state } : {};
}

function summarizeActionMessages(actions, before, after) {
  return {
    before: before.length,
    after: after.length,
    inserted: sumActionCount(actions, 'inserted'),
    removed: sumActionCount(actions, 'removed'),
    replaced: sumActionCount(actions, 'replaced')
  };
}

function sumActionCount(actions, key) {
  return actions.reduce((total, action) => total + (action.summary?.messages?.[key] || 0), 0);
}

function summarizeState(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return {
    changedKeys: [...keys].filter((key) => before[key] !== after[key])
  };
}

function applyMatchingRule(messages, state, rule, index, options) {
  const applied = applyActions(messages, rule.then || [], { ...options, state });
  return {
    messages: applied.messages,
    state: applied.state,
    trace: {
      ruleIndex: index,
      ruleId: rule.id,
      matched: true,
      actions: applied.trace,
      summary: {
        messages: summarizeActionMessages(applied.trace, messages, applied.messages),
        state: summarizeState(state, applied.state)
      }
    }
  };
}

function formatRuleError(index, stage, error) {
  return `rule[${index}] ${stage}: ${error.message}`;
}

function applyGameCard({ card, phase, messages = [], state = {}, event = {}, contentBaseDir, fileContents, fs, path } = {}) {
  const validation = validateGameCard(card);
  const initialMessages = cloneMessages(messages);
  const initialState = cloneState(state);
  const trace = {
    phase,
    rules: [],
    errors: validation.errors
  };

  if (!validation.valid) {
    return { messages: initialMessages, state: initialState, trace };
  }

  const result = card.rules.reduce((current, rule, index) => {
    try {
      if (!matchesWhen(rule.when, phase, current.messages)) return current;
    } catch (error) {
      return {
        ...current,
        trace: {
          ...current.trace,
          errors: [...current.trace.errors, formatRuleError(index, 'when', error)]
        }
      };
    }

    let applied;
    try {
      applied = applyMatchingRule(current.messages, current.state, rule, index, {
        card,
        event: { ...event, phase },
        baseDir: contentBaseDir,
        fileContents,
        fs,
        path
      });
    } catch (error) {
      return {
        ...current,
        trace: {
          ...current.trace,
          errors: [...current.trace.errors, formatRuleError(index, 'then', error)]
        }
      };
    }
    return {
      messages: applied.messages,
      state: applied.state,
      trace: {
        ...current.trace,
        rules: [...current.trace.rules, applied.trace]
      }
    };
  }, { messages: initialMessages, state: initialState, trace });

  return {
    messages: result.messages,
    state: result.state,
    trace: result.trace
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyGameCard, cloneMessages };
}
