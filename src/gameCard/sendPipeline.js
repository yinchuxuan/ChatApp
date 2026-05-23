const { applyGameCard } = require('./engine');
const { adaptMessagesToProtocol } = require('./protocolAdapter');
const { decayTTL } = require('./ttl');

function extractActiveCard(result) {
  if (!result || result.success === false) return null;
  if (result.rules) return result;
  return result.card || result.gameCard || result.activeGameCard || null;
}

async function loadActiveGameCard(api) {
  if (!api || typeof api.getActiveGameCard !== 'function') return null;
  try {
    return extractActiveCard(await api.getActiveGameCard());
  } catch (_) {
    return null;
  }
}

async function preparePreSendMessages({ messages = [], state = {}, event = {}, card } = {}) {
  const activeCard = card === undefined
    ? await loadActiveGameCard(typeof window !== 'undefined' ? window.electronAPI : null)
    : card;

  if (!activeCard) {
    return { messages, state, trace: null, applied: false, card: null };
  }

  return {
    ...applyGameCard({ card: activeCard, phase: 'pre_send', messages, state, event }),
    applied: true,
    card: activeCard
  };
}

async function prepareAfterResponseMessages({ messages = [], state = {}, event = {}, card } = {}) {
  const activeCard = card === undefined
    ? await loadActiveGameCard(typeof window !== 'undefined' ? window.electronAPI : null)
    : card;

  if (!activeCard) {
    return { messages, state, trace: null, ttlTrace: null, applied: false, card: null };
  }

  const result = applyGameCard({ card: activeCard, phase: 'after_response', messages, state, event });
  const ttl = decayTTL(result.messages);
  return {
    messages: ttl.messages,
    state: result.state,
    trace: result.trace,
    ttlTrace: ttl.trace,
    applied: true,
    card: activeCard
  };
}

function toApiMessages(messages) {
  return adaptMessagesToProtocol(messages, 'openai').messages;
}

if (typeof window !== 'undefined') {
  window.preparePreSendMessages = preparePreSendMessages;
  window.prepareAfterResponseMessages = prepareAfterResponseMessages;
  window.toGameCardApiMessages = toApiMessages;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractActiveCard,
    loadActiveGameCard,
    preparePreSendMessages,
    prepareAfterResponseMessages,
    toApiMessages,
    adaptMessagesToProtocol
  };
}
