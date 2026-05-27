const path = require('path');
const { isSafeGameCardId } = require('./gameCardStorage');

const DEFAULT_SESSION_ID = 'default';

function getActiveCardId(fs, gameCardsDir) {
  const activePath = path.join(gameCardsDir, 'active.json');
  if (!fs.existsSync(activePath)) return null;
  try {
    const active = JSON.parse(fs.readFileSync(activePath, 'utf-8'));
    return active && isSafeGameCardId(active.id) ? active.id : null;
  } catch {
    return null;
  }
}

function getSessionRoot(fs, gameCardsDir) {
  const cardsDir = path.join(gameCardsDir, 'cards');
  const activeId = getActiveCardId(fs, gameCardsDir);
  if (activeId) {
    const cardPath = path.join(cardsDir, activeId, 'card.json');
    if (fs.existsSync(cardPath)) return path.join(cardsDir, activeId, 'sessions');
  }
  return path.join(gameCardsDir, 'no-card', 'sessions');
}

function getMessagesPath(fs, gameCardsDir) {
  const sessionRoot = getSessionRoot(fs, gameCardsDir);
  const activeSessionPath = path.join(sessionRoot, 'active.json');
  let sessionId = DEFAULT_SESSION_ID;
  if (fs.existsSync(activeSessionPath)) {
    try {
      const activeSession = JSON.parse(fs.readFileSync(activeSessionPath, 'utf-8'));
      if (activeSession && isSafeGameCardId(activeSession.id)) sessionId = activeSession.id;
    } catch {
      sessionId = DEFAULT_SESSION_ID;
    }
  }
  return path.join(sessionRoot, sessionId, 'messages.json');
}

function getRetryBasePath(fs, gameCardsDir) {
  return path.join(path.dirname(getMessagesPath(fs, gameCardsDir)), 'retry-base.json');
}

function cleanMessages(messages) {
  return messages.map(msg => {
    const cleaned = { role: msg.role, content: msg.content };
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
    const restored = { ...msg };
    if (msg.thinking) restored._thinking = msg.thinking;
    return restored;
  });
}

function parseHistoryContent(content) {
  const data = JSON.parse(content);
  if (Array.isArray(data)) {
    return { messages: restoreMessages(data), gameState: {} };
  }
  if (!isPlainObject(data)) {
    return { messages: [], gameState: {} };
  }
  return {
    messages: Array.isArray(data.messages) ? restoreMessages(data.messages) : [],
    gameState: cleanGameState(data.gameState)
  };
}

function normalizeSavePayload(payload, options) {
  if (Array.isArray(payload)) {
    return {
      messages: payload,
      gameState: cleanGameState(options.gameState)
    };
  }
  if (isPlainObject(payload)) {
    return {
      messages: Array.isArray(payload.messages) ? payload.messages : [],
      gameState: cleanGameState(payload.gameState)
    };
  }
  return { messages: [], gameState: {} };
}

function ensureSessionFiles(fs, messagesPath) {
  const sessionDir = path.dirname(messagesPath);
  const sessionRoot = path.dirname(sessionDir);
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  const activeSessionPath = path.join(sessionRoot, 'active.json');
  if (!fs.existsSync(activeSessionPath)) {
    fs.writeFileSync(activeSessionPath, JSON.stringify({ id: path.basename(sessionDir) }, null, 2), 'utf-8');
  }
}

function migrateLegacyHistory(fs, messagesPath, legacyChatHistoryPath) {
  const legacyPath = [].concat(legacyChatHistoryPath || [])
    .find(filePath => filePath && fs.existsSync(filePath));
  if (!legacyPath || fs.existsSync(messagesPath)) {
    return;
  }
  ensureSessionFiles(fs, messagesPath);
  fs.copyFileSync(legacyPath, messagesPath);
}

function registerChatHistoryHandlers(ipcMain, gameCardsDir, fs, legacyChatHistoryPath) {
  migrateLegacyHistory(fs, getMessagesPath(fs, gameCardsDir), legacyChatHistoryPath);

  ipcMain.handle('get-chat-history', () => {
    try {
      const messagesPath = getMessagesPath(fs, gameCardsDir);
      if (fs.existsSync(messagesPath)) {
        const content = fs.readFileSync(messagesPath, 'utf-8');
        const history = parseHistoryContent(content);
        const result = { success: true, messages: history.messages, gameState: history.gameState };
        const retryBasePath = getRetryBasePath(fs, gameCardsDir);
        if (fs.existsSync(retryBasePath)) {
          const retryBase = JSON.parse(fs.readFileSync(retryBasePath, 'utf-8'));
          if (Array.isArray(retryBase) && retryBase.length > 0) {
            result.retryBaseMessages = restoreMessages(retryBase);
          }
        }
        return result;
      }
      return { success: true, messages: [], gameState: {} };
    } catch (err) {
      console.error('Error reading chat history:', err);
      return { success: false, error: err.message, messages: [], gameState: {} };
    }
  });

  ipcMain.handle('save-chat-history', (event, payload, options = {}) => {
    try {
      const messagesPath = getMessagesPath(fs, gameCardsDir);
      ensureSessionFiles(fs, messagesPath);
      const retryBasePath = getRetryBasePath(fs, gameCardsDir);
      const retryBase = Array.isArray(options.retryBaseMessages) ? options.retryBaseMessages : [];
      const history = normalizeSavePayload(payload, options);
      const cleanedHistory = {
        messages: cleanMessages(history.messages),
        gameState: history.gameState
      };
      fs.writeFileSync(messagesPath, JSON.stringify(cleanedHistory, null, 2), 'utf-8');
      fs.writeFileSync(retryBasePath, JSON.stringify(cleanMessages(retryBase), null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('Error saving chat history:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerChatHistoryHandlers };
