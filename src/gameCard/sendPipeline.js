const { applyGameCard } = require('./engine');

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
    return { messages, state, trace: null, applied: false };
  }

  return {
    ...applyGameCard({ card: activeCard, phase: 'pre_send', messages, state, event }),
    applied: true
  };
}

function toApiMessages(messages) {
  return messages
    .filter((msg) => msg?._meta?.visibility !== 'debug_only')
    .map((msg) => ({ role: msg.role, content: msg.content }));
}

if (typeof window !== 'undefined') {
  window.preparePreSendMessages = preparePreSendMessages;
  window.toGameCardApiMessages = toApiMessages;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractActiveCard, loadActiveGameCard, preparePreSendMessages, toApiMessages };
}
