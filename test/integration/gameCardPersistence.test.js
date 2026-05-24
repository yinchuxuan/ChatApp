const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerGameCardHandlers } = require('../../ipc/gameCardHandlers');

function createIpcMain() {
  const handlers = {};
  return {
    handlers,
    handle: (channel, handler) => {
      handlers[channel] = handler;
    }
  };
}

describe('Game Card Persistence IPC', () => {
  let tempDir;
  let ipcMain;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-game-cards-'));
    ipcMain = createIpcMain();
    registerGameCardHandlers(ipcMain, path.join(tempDir, 'game-cards'), fs);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('saves and lists game cards', async () => {
    const card = { id: 'quest_1', name: 'Quest', rules: [] };

    const saveResult = await ipcMain.handlers['save-game-card']({}, card);
    const listResult = await ipcMain.handlers['get-game-cards']();

    expect(saveResult.success).toBe(true);
    expect(listResult).toEqual({ success: true, cards: [card] });
  });

  test('reads a card by id', async () => {
    const card = { id: 'quest', name: 'Quest', rules: [] };
    await ipcMain.handlers['save-game-card']({}, card);

    const result = await ipcMain.handlers['get-game-card']({}, 'quest');

    expect(result).toEqual({ success: true, card });
  });

  test('sets and gets active game card', async () => {
    const card = { id: 'quest', name: 'Quest', rules: [] };
    await ipcMain.handlers['save-game-card']({}, card);

    const setResult = await ipcMain.handlers['set-active-game-card']({}, 'quest');
    const getResult = await ipcMain.handlers['get-active-game-card']();

    expect(setResult.success).toBe(true);
    expect(getResult).toEqual({ success: true, card });
  });

  test('clears active game card', async () => {
    const result = await ipcMain.handlers['set-active-game-card']({}, null);
    const active = await ipcMain.handlers['get-active-game-card']();

    expect(result.success).toBe(true);
    expect(active).toEqual({ success: true, card: null });
  });

  test('rejects unsafe ids', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const saveResult = await ipcMain.handlers['save-game-card'](
      {},
      { id: '../quest', rules: [] }
    );
    const readResult = await ipcMain.handlers['get-game-card']({}, '../quest');

    expect(saveResult.success).toBe(false);
    expect(readResult.success).toBe(false);
    errorSpy.mockRestore();
  });
});
