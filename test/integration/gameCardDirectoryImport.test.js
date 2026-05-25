const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerGameCardHandlers } = require('../../ipc/gameCardHandlers');

function createIpcMain() {
  const handlers = {};
  return {
    handlers,
    handle: (channel, handler) => { handlers[channel] = handler; }
  };
}

describe('Game Card Directory Import', () => {
  let tempDir;
  let ipcMain;
  let dialog;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-game-card-dir-'));
    ipcMain = createIpcMain();
    dialog = { showOpenDialog: jest.fn() };
    registerGameCardHandlers(ipcMain, path.join(tempDir, 'game-cards'), fs, dialog);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('rejects folder without card json', async () => {
    const badDir = path.join(tempDir, 'missing-card-json');
    fs.mkdirSync(badDir, { recursive: true });
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [badDir] });

    const result = await ipcMain.handlers['import-game-card-from-directory']();

    expect(result.success).toBe(false);
    expect(result.error).toContain('card.json');
    expect(result.card).toBe(null);
  });

  test('rejects schema-invalid card json', async () => {
    const badDir = path.join(tempDir, 'schema-invalid-card');
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, 'card.json'), JSON.stringify({
      version: '1.0',
      id: 'schema_bad',
      name: 'Schema Bad'
    }), 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [badDir] });

    const result = await ipcMain.handlers['import-game-card-from-directory']();

    expect(result.success).toBe(false);
    expect(result.error).toContain('schema');
    expect(result.card).toBe(null);
  });
});
