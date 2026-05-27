const { applyGameCard } = require('./engine');
const { adaptMessagesToProtocol } = require('./protocolAdapter');
const { decayTTL } = require('./ttl');
const { parseFileSectionRef } = require('./fileSections');
const { loadExternalStateSchema } = require('./stateSchemaLoader');

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

function collectFileContentPaths(card) {
  const paths = new Set();
  const contentPattern = /\{\{file_content:((?:\\.|[^}])*)\}\}/g;
  JSON.stringify(card?.rules || []).replace(contentPattern, (_, filePath) => {
    paths.add(filePath.replaceAll('\\}}', '}}').replaceAll('\\\\', '\\'));
    return '';
  });
  const sectionPattern = /\{\{file_section:((?:\\.|[^}])*)\}\}/g;
  JSON.stringify(card?.rules || []).replace(sectionPattern, (_, ref) => {
    const decoded = ref.replaceAll('\\}}', '}}').replaceAll('\\\\', '\\');
    paths.add(parseFileSectionRef(decoded).filePath);
    return '';
  });
  return [...paths];
}

async function loadFileContents(card, api) {
  if (!card?.id || !api || typeof api.readGameCardFile !== 'function') return {};
  const entries = await Promise.all(collectFileContentPaths(card).map(async (filePath) => {
    const result = await api.readGameCardFile(card.id, filePath);
    if (!result?.success) throw new Error(result?.error || 'failed to read game card file');
    return [filePath, result.content || ''];
  }));
  return Object.fromEntries(entries);
}

async function loadCardResources(card, api) {
  const cardWithSchema = await loadExternalStateSchema(card, api);
  return {
    card: cardWithSchema,
    fileContents: await loadFileContents(cardWithSchema, api)
  };
}

async function preparePreSendMessages({ messages = [], state = {}, event = {}, card, protocol = 'openai' } = {}) {
  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  const activeCard = card === undefined
    ? await loadActiveGameCard(api)
    : card;

  if (!activeCard) {
    return { messages, state, trace: null, ttlTrace: null, applied: false, card: null };
  }

  const ttl = decayTTL(messages);
  let resources;
  try {
    resources = await loadCardResources(activeCard, api);
  } catch (error) {
    return { messages, state, trace: null, ttlTrace: ttl.trace, applied: false, card: null, error: error.message };
  }
  return {
    ...applyGameCard({ card: resources.card, phase: 'pre_send', messages: ttl.messages, state, event, fileContents: resources.fileContents }),
    ttlTrace: ttl.trace,
    applied: true,
    card: resources.card,
    protocol
  };
}

async function prepareAfterResponseMessages({ messages = [], state = {}, event = {}, card } = {}) {
  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  const activeCard = card === undefined
    ? await loadActiveGameCard(api)
    : card;

  if (!activeCard) {
    return { messages, state, trace: null, ttlTrace: null, applied: false, card: null };
  }

  let resources;
  try {
    resources = await loadCardResources(activeCard, api);
  } catch (error) {
    return { messages, state, trace: null, ttlTrace: null, applied: false, card: null, error: error.message };
  }
  return {
    ...applyGameCard({ card: resources.card, phase: 'after_response', messages, state, event, fileContents: resources.fileContents }),
    ttlTrace: null,
    applied: true,
    card: resources.card
  };
}

function hasMessageChanges(before, after) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

async function prepareInitMessages({ messages = [], state = {}, event = {}, card } = {}) {
  const api = typeof window !== 'undefined' ? window.electronAPI : null;
  const activeCard = card === undefined
    ? await loadActiveGameCard(api)
    : card;

  if (!activeCard || messages.length > 0) {
    return { messages, state, trace: null, ttlTrace: null, applied: false, changed: false, card: activeCard || null };
  }

  let resources;
  try {
    resources = await loadCardResources(activeCard, api);
  } catch (error) {
    return { messages, state, trace: null, ttlTrace: null, applied: false, changed: false, card: null, error: error.message };
  }

  const result = applyGameCard({ card: resources.card, phase: 'init', messages, state, event, fileContents: resources.fileContents });
  const changed = hasMessageChanges(messages, result.messages);
  return { ...result, ttlTrace: null, applied: true, changed, card: resources.card };
}

function toApiMessages(messages, protocol = 'openai') {
  return adaptMessagesToProtocol(messages, protocol).messages;
}

if (typeof window !== 'undefined') {
  window.preparePreSendMessages = preparePreSendMessages;
  window.prepareAfterResponseMessages = prepareAfterResponseMessages;
  window.prepareInitMessages = prepareInitMessages;
  window.toGameCardApiMessages = toApiMessages;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractActiveCard,
    loadActiveGameCard,
    loadCardResources,
    prepareInitMessages,
    preparePreSendMessages,
    prepareAfterResponseMessages,
    toApiMessages,
    adaptMessagesToProtocol
  };
}
