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
        const messages = JSON.parse(content);
        // Restore _thinking from thinking field for UI compatibility
        const restored = Array.isArray(messages) ? messages.map(msg => {
          const restored = { ...msg };
          if (msg.thinking) restored._thinking = msg.thinking;
          return restored;
        }) : [];
        return { success: true, messages: restored };
      }
      return { success: true, messages: [] };
    } catch (err) {
      console.error('Error reading chat history:', err);
      return { success: false, error: err.message, messages: [] };
    }
  });

  ipcMain.handle('save-chat-history', (event, messages) => {
    try {
      const messagesPath = getMessagesPath(fs, gameCardsDir);
      ensureSessionFiles(fs, messagesPath);
      // Persist runtime fields needed by game card rules after restart.
      const cleanedMessages = messages.map(msg => {
        const cleaned = { role: msg.role, content: msg.content };
        if (msg.thinking) cleaned.thinking = msg.thinking;
        if (msg._meta) cleaned._meta = msg._meta;
        if (msg.ttl !== undefined) cleaned.ttl = msg.ttl;
        return cleaned;
      });
      fs.writeFileSync(messagesPath, JSON.stringify(cleanedMessages, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('Error saving chat history:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerChatHistoryHandlers };
