const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerChatHistoryHandlers } = require('../../ipc/chatHistoryHandlers');
const { registerGameCardHandlers } = require('../../ipc/gameCardHandlers');

function createIpcMain() {
  const handlers = {};
  return {
    handlers,
    handle: (channel, handler) => { handlers[channel] = handler; }
  };
}

describe('Game Card Import Sessions', () => {
  let tempDir;
  let ipcMain;
  let dialog;
  let gameCardsDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-game-card-import-sessions-'));
    ipcMain = createIpcMain();
    dialog = { showOpenDialog: jest.fn() };
    gameCardsDir = path.join(tempDir, 'game-cards');
    registerGameCardHandlers(ipcMain, gameCardsDir, fs, dialog);
    registerChatHistoryHandlers(ipcMain, gameCardsDir, fs);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('keeps sessions when importing a card with the same id', async () => {
    const card = { version: '1.0', id: 'wa2', name: 'WA2', rules: [] };
    await ipcMain.handlers['save-game-card']({}, card);
    await ipcMain.handlers['set-active-game-card']({}, card.id);
    await ipcMain.handlers['save-chat-history']({}, {
      messages: [{ role: 'user', content: 'chapter one save' }],
      gameState: { story: { chapter: 'chapter_1' } }
    }, {
      retryBaseMessages: [{ role: 'user', content: 'retry point' }],
      retryBaseState: { story: { chapter: 'chapter_1' } }
    });

    const importDir = path.join(tempDir, 'new-wa2');
    fs.mkdirSync(path.join(importDir, 'plot'), { recursive: true });
    fs.writeFileSync(path.join(importDir, 'card.json'), JSON.stringify({
      ...card,
      description: 'new chapter build'
    }), 'utf-8');
    fs.writeFileSync(path.join(importDir, 'plot', 'chapter-2.md'), 'chapter two', 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [importDir] });

    const importResult = await ipcMain.handlers['import-game-card-from-directory']();
    const history = await ipcMain.handlers['get-chat-history']();
    const asset = await ipcMain.handlers['read-game-card-file']({}, card.id, 'plot/chapter-2.md');

    expect(importResult.success).toBe(true);
    expect(history.messages).toEqual([{ role: 'user', content: 'chapter one save' }]);
    expect(history.gameState).toEqual({ story: { chapter: 'chapter_1' } });
    expect(history.retryBaseMessages).toEqual([{ role: 'user', content: 'retry point' }]);
    expect(history.retryBaseState).toEqual({ story: { chapter: 'chapter_1' } });
    expect(asset).toEqual({ success: true, content: 'chapter two' });
  });
});
