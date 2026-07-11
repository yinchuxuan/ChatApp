const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerChatHistoryHandlers } = require('../../ipc/chatHistoryHandlers');
const { createJsonStore } = require('../../ipc/storage/jsonStore');

function createIpcMain() {
  const handlers = {};
  return { handlers, handle: (channel, handler) => { handlers[channel] = handler; } };
}

describe('Chat session save queue', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-save-queue-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('serializes concurrent saves for the same session', async () => {
    const baseStore = createJsonStore(fs);
    let delayed = false;
    const store = {
      ...baseStore,
      writeJson: async (filePath, value) => {
        if (!delayed && value?.messages?.[0]?.content === 'first') {
          delayed = true;
          await new Promise(resolve => setTimeout(resolve, 30));
        }
        return baseStore.writeJson(filePath, value);
      }
    };
    const ipcMain = createIpcMain();
    registerChatHistoryHandlers(ipcMain, path.join(tempDir, 'game-cards'), fs, { store });

    const first = ipcMain.handlers['save-chat-history']({}, [{ role: 'user', content: 'first' }], {
      retryBaseMessages: [{ role: 'user', content: 'first retry' }]
    });
    const second = ipcMain.handlers['save-chat-history']({}, [{ role: 'user', content: 'second' }], {
      retryBaseMessages: [{ role: 'user', content: 'second retry' }]
    });
    await Promise.all([first, second]);

    const loaded = await ipcMain.handlers['get-chat-history']();
    const listed = await ipcMain.handlers['list-chat-sessions']();
    expect(loaded.messages[0].content).toBe('second');
    expect(loaded.retryBaseMessages[0].content).toBe('second retry');
    expect(listed.sessions[0].preview).toBe('second');
  });
});
