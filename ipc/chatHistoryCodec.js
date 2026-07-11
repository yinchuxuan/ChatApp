const { randomUUID } = require('node:crypto');

function cleanMessages(messages) {
  return messages.map(msg => {
    const cleaned = { role: msg.role, content: msg.content };
    if (msg.id) cleaned.id = msg.id;
    if (msg.thinking) cleaned.thinking = msg.thinking;
    if (msg._meta) cleaned._meta = msg._meta;
    if (msg.ttl !== undefined) cleaned.ttl = msg.ttl;
    return cleaned;
  });
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cleanGameState(gameState) {
  return isPlainObject(gameState) ? JSON.parse(JSON.stringify(gameState)) : {};
}

function restoreMessages(messages) {
  return messages.map(msg => {
    const restored = { ...msg, id: msg.id || randomUUID() };
    if (msg.thinking) restored._thinking = msg.thinking;
    return restored;
  });
}

function parseHistory(data) {
  if (Array.isArray(data)) return { messages: restoreMessages(data), gameState: {} };
  if (!isPlainObject(data)) return { messages: [], gameState: {} };
  return {
    messages: Array.isArray(data.messages) ? restoreMessages(data.messages) : [],
    gameState: cleanGameState(data.gameState)
  };
}

function parseRetryBase(data) {
  if (Array.isArray(data)) return { messages: restoreMessages(data), gameState: {}, hasGameState: false };
  if (!isPlainObject(data)) return { messages: [], gameState: {}, hasGameState: false };
  return {
    messages: Array.isArray(data.messages) ? restoreMessages(data.messages) : [],
    gameState: cleanGameState(data.gameState),
    hasGameState: Object.prototype.hasOwnProperty.call(data, 'gameState')
  };
}

function createHistory(payload, options) {
  const source = Array.isArray(payload)
    ? { messages: payload, gameState: options.gameState }
    : isPlainObject(payload) ? payload : {};
  return {
    messages: cleanMessages(Array.isArray(source.messages) ? source.messages : []),
    gameState: cleanGameState(source.gameState)
  };
}

function createRetryBase(options) {
  return {
    messages: Array.isArray(options.retryBaseMessages) ? cleanMessages(options.retryBaseMessages) : [],
    gameState: cleanGameState(options.retryBaseState)
  };
}

module.exports = { createHistory, createRetryBase, parseHistory, parseRetryBase };
