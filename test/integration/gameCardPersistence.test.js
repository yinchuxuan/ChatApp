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
  let dialog;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-game-cards-'));
    ipcMain = createIpcMain();
    dialog = { showOpenDialog: jest.fn() };
    registerGameCardHandlers(ipcMain, path.join(tempDir, 'game-cards'), fs, dialog);
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

  test('imports a game card file and sets it active', async () => {
    const card = { id: 'imported_quest', name: 'Imported Quest', rules: [] };
    const cardPath = path.join(tempDir, 'imported.json');
    fs.writeFileSync(cardPath, JSON.stringify(card), 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [cardPath] });

    const importResult = await ipcMain.handlers['import-game-card-from-file']();
    const activeResult = await ipcMain.handlers['get-active-game-card']();

    expect(importResult).toEqual({ success: true, card });
    expect(activeResult).toEqual({ success: true, card });
  });

  test('cancels game card import without changing active card', async () => {
    dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    const result = await ipcMain.handlers['import-game-card-from-file']();

    expect(result).toEqual({ success: false, canceled: true, card: null });
  });

  test('clears active game card', async () => {
    const result = await ipcMain.handlers['set-active-game-card']({}, null);
    const active = await ipcMain.handlers['get-active-game-card']();

    expect(result.success).toBe(true);
    expect(active).toEqual({ success: true, card: null });
  });

  test('reads game card asset files from the card directory', async () => {
    const filePath = path.join(tempDir, 'game-cards', 'cards', 'quest', 'worldbook', 'rules.md');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'rules', 'utf-8');

    const result = await ipcMain.handlers['read-game-card-file']({}, 'quest', 'worldbook/rules.md');

    expect(result).toEqual({ success: true, content: 'rules' });
  });

  test('rejects game card asset paths outside the card directory', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await ipcMain.handlers['read-game-card-file']({}, 'quest', '../secret.md');

    expect(result.success).toBe(false);
    expect(result.error).toContain('file_content path must stay inside game card directory');
    errorSpy.mockRestore();
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
