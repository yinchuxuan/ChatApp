const sessions = require('./chatSessionStore');
const { createHistory, createRetryBase, parseHistory, parseRetryBase } = require('./chatHistoryCodec');
const { createJsonStore } = require('./storage/jsonStore');
const { createKeyedQueue } = require('./storage/keyedQueue');

function failure(error, fallback = {}) {
  return { success: false, error: error.message, ...fallback };
}

function registerChatHistoryHandlers(ipcMain, gameCardsDir, fs, options = {}) {
  const store = options.store || createJsonStore(fs);
  const queue = options.queue || createKeyedQueue();

  ipcMain.handle('get-chat-history', async () => {
    try {
      const context = await sessions.getActiveSessionContext(store, gameCardsDir);
      return await queue.run(context.sessionDir, async () => {
        const data = await store.readJson(context.messagesPath, null);
        if (data === null) return { success: true, messages: [], gameState: {} };
        const history = parseHistory(data);
        const result = { success: true, messages: history.messages, gameState: history.gameState };
        const retryData = await store.readJson(context.retryBasePath, null);
        if (retryData !== null) {
          const retryBase = parseRetryBase(retryData);
          if (retryBase.messages.length > 0) result.retryBaseMessages = retryBase.messages;
          if (retryBase.hasGameState) result.retryBaseState = retryBase.gameState;
        }
        return result;
      });
    } catch (err) {
      console.error('Error reading chat history:', err);
      return failure(err, { messages: [], gameState: {} });
    }
  });

  ipcMain.handle('save-chat-history', async (event, payload, saveOptions = {}) => {
    try {
      const context = await sessions.getActiveSessionContext(store, gameCardsDir);
      const history = createHistory(payload, saveOptions);
      const retryBase = createRetryBase(saveOptions);
      return await queue.run(context.sessionDir, async () => {
        await sessions.ensureSessionFiles(store, context);
        await store.writeJson(context.messagesPath, history);
        await store.writeJson(context.retryBasePath, retryBase);
        await sessions.updateSessionMeta(store, context, history.messages);
        return { success: true };
      });
    } catch (err) {
      console.error('Error saving chat history:', err);
      return failure(err);
    }
  });

  ipcMain.handle('list-chat-sessions', async () => {
    try {
      return { success: true, ...await sessions.listSessions(store, gameCardsDir) };
    } catch (err) {
      return failure(err, { sessions: [], activeId: null });
    }
  });

  ipcMain.handle('get-active-chat-session', async () => {
    try {
      const list = await sessions.listSessions(store, gameCardsDir);
      return { success: true, session: list.sessions.find(item => item.id === list.activeId) || null };
    } catch (err) {
      return failure(err, { session: null });
    }
  });

  ipcMain.handle('create-chat-session', async (event, title) => {
    try {
      return { success: true, ...await sessions.createSession(store, gameCardsDir, title) };
    } catch (err) {
      return failure(err);
    }
  });

  ipcMain.handle('set-active-chat-session', async (event, id) => {
    try {
      return { success: true, ...await sessions.setActiveSession(store, gameCardsDir, id) };
    } catch (err) {
      return failure(err);
    }
  });

  ipcMain.handle('rename-chat-session', async (event, id, title) => {
    try {
      return { success: true, session: await sessions.renameSession(store, gameCardsDir, id, title) };
    } catch (err) {
      return failure(err);
    }
  });

  ipcMain.handle('delete-chat-session', async (event, id) => {
    try {
      return { success: true, ...await sessions.deleteSession(store, gameCardsDir, id) };
    } catch (err) {
      return failure(err);
    }
  });
}

module.exports = { registerChatHistoryHandlers };
