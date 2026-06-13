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
    expect(fs.existsSync(path.join(tempDir, 'game-cards', 'cards', 'quest_1', 'card.json'))).toBe(true);
    expect(listResult).toEqual({ success: true, cards: [card] });
  });

  test('reads a card by id', async () => {
    const card = { id: 'quest', name: 'Quest', rules: [] };
    await ipcMain.handlers['save-game-card']({}, card);

    const result = await ipcMain.handlers['get-game-card']({}, 'quest');

    expect(result).toEqual({ success: true, card });
  });

  test('migrates legacy flat card files into card directories', async () => {
    const card = { id: 'legacy_quest', name: 'Legacy Quest', rules: [] };
    const legacyPath = path.join(tempDir, 'game-cards', 'cards', 'legacy_quest.json');
    fs.mkdirSync(path.dirname(legacyPath), { recursive: true });
    fs.writeFileSync(legacyPath, JSON.stringify(card), 'utf-8');

    const freshIpcMain = createIpcMain();
    registerGameCardHandlers(freshIpcMain, path.join(tempDir, 'game-cards'), fs, dialog);

    const result = await freshIpcMain.handlers['get-game-card']({}, 'legacy_quest');

    expect(result).toEqual({ success: true, card });
    expect(fs.existsSync(path.join(tempDir, 'game-cards', 'cards', 'legacy_quest', 'card.json'))).toBe(true);
  });

  test('sets and gets active game card', async () => {
    const card = { id: 'quest', name: 'Quest', rules: [] };
    await ipcMain.handlers['save-game-card']({}, card);

    const setResult = await ipcMain.handlers['set-active-game-card']({}, 'quest');
    const getResult = await ipcMain.handlers['get-active-game-card']();

    expect(setResult.success).toBe(true);
    expect(getResult).toEqual({ success: true, card });
  });

  test('imports a game card folder and sets it active', async () => {
    const card = { version: '1.0', id: 'imported_quest', name: 'Imported Quest', rules: [] };
    const cardDir = path.join(tempDir, 'imported-card');
    fs.mkdirSync(path.join(cardDir, 'worldbook'), { recursive: true });
    fs.writeFileSync(path.join(cardDir, 'card.json'), JSON.stringify(card), 'utf-8');
    fs.writeFileSync(path.join(cardDir, 'worldbook', 'rules.md'), 'rules', 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [cardDir] });

    const importResult = await ipcMain.handlers['import-game-card-from-directory']();
    const activeResult = await ipcMain.handlers['get-active-game-card']();
    const assetResult = await ipcMain.handlers['read-game-card-file']({}, card.id, 'worldbook/rules.md');

    expect(importResult).toEqual({ success: true, card });
    expect(activeResult).toEqual({ success: true, card });
    expect(assetResult).toEqual({ success: true, content: 'rules' });
  });

  test('cancels game card import without changing active card', async () => {
    dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    const result = await ipcMain.handlers['import-game-card-from-directory']();

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
    expect(result.error).toContain('game card file path must stay inside game card directory');
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
