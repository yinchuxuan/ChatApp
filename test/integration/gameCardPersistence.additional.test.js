/**
 * Additional Game Card Persistence IPC tests - error handling, security, and round-trip.
 * Split from gameCardPersistence.test.js to keep files under 200 lines.
 */

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

describe('Game Card Persistence - Error Handling and Security', () => {
  let tempDir;
  let ipcMain;
  let dialog;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-game-cards-err-'));
    ipcMain = createIpcMain();
    dialog = { showOpenDialog: jest.fn() };
    registerGameCardHandlers(ipcMain, path.join(tempDir, 'game-cards'), fs, dialog);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('imports invalid JSON returns stable error', async () => {
    const badPath = path.join(tempDir, 'bad.json');
    fs.writeFileSync(badPath, '{not valid json}', 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [badPath] });

    const result = await ipcMain.handlers['import-game-card-from-file']();

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.card).toBe(null);
  });

  test('imports card with unsafe id returns stable error', async () => {
    const card = { id: 'bad/../quest', name: 'Bad Quest', rules: [] };
    const badPath = path.join(tempDir, 'unsafe.json');
    fs.writeFileSync(badPath, JSON.stringify(card), 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [badPath] });

    const result = await ipcMain.handlers['import-game-card-from-file']();

    expect(result.success).toBe(false);
    expect(result.error).toContain('safe id');
    expect(result.card).toBe(null);
  });

  test('rejects absolute path traversal for card assets', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await ipcMain.handlers['read-game-card-file']({}, 'quest', '/etc/passwd');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/must be relative|must stay inside/);
    errorSpy.mockRestore();
  });

  test('rejects symlink path traversal for card assets', async () => {
    const cardDir = path.join(tempDir, 'game-cards', 'cards', 'symlink-quest');
    fs.mkdirSync(cardDir, { recursive: true });
    const secretDir = path.join(tempDir, 'secrets');
    fs.mkdirSync(secretDir, { recursive: true });
    fs.writeFileSync(path.join(secretDir, 'secret.md'), 'secret content', 'utf-8');

    const linkPath = path.join(cardDir, 'escape-link');
    try {
      fs.symlinkSync(secretDir, linkPath, 'dir');
    } catch (e) {
      return; // symlinks may not be available
    }

    const result = await ipcMain.handlers['read-game-card-file']({}, 'symlink-quest', 'escape-link/secret.md');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/must stay inside|not found/);
  });
});

describe('Game Card Persistence - Restart and Round-trip', () => {
  let tempDir;
  let ipcMain;
  let dialog;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-game-cards-rt-'));
    ipcMain = createIpcMain();
    dialog = { showOpenDialog: jest.fn() };
    registerGameCardHandlers(ipcMain, path.join(tempDir, 'game-cards'), fs, dialog);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('active card persists after simulated restart', async () => {
    const card = { id: 'persisted', name: 'Persisted Quest', rules: [] };
    await ipcMain.handlers['save-game-card']({}, card);
    await ipcMain.handlers['set-active-game-card']({}, 'persisted');

    const freshIpcMain = createIpcMain();
    const freshDialog = { showOpenDialog: jest.fn() };
    registerGameCardHandlers(freshIpcMain, path.join(tempDir, 'game-cards'), fs, freshDialog);

    const result = await freshIpcMain.handlers['get-active-game-card']();

    expect(result).toEqual({ success: true, card });
  });

  test('game card with complex rules survives round-trip', async () => {
    const card = {
      version: '1',
      id: 'complex-quest',
      name: 'Complex Quest',
      description: 'A quest with multiple rules',
      author: 'Test Author',
      state: { player: { hp: 100, mp: 50 } },
      rules: [
        {
          id: 'bootstrap',
          when: { phase: 'pre_send', length: { lte: 1 } },
          then: [
            {
              type: 'insert',
              predicate: { index: 0 },
              anchor: 'before',
              role: 'system',
              content: '{{file_content:worldbook/rules.md}}',
              ttl: -1,
              _meta: { source: 'game_card', visibility: 'llm_only' }
            }
          ]
        },
        {
          when: { phase: 'after_response', last: { role: 'assistant' } },
          then: [
            {
              type: 'replace',
              predicate: { role: 'assistant' },
              content: "{{original_content}}.regex_replace{pattern:'^```',with:''}"
            }
          ]
        }
      ]
    };

    await ipcMain.handlers['save-game-card']({}, card);
    const result = await ipcMain.handlers['get-game-card']({}, 'complex-quest');

    expect(result).toEqual({ success: true, card });
    expect(result.card.rules.length).toBe(2);
    expect(result.card.state.player.hp).toBe(100);
    expect(result.card.rules[0].then[0]._meta.visibility).toBe('llm_only');
  });

  test('empty card id is rejected on save', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await ipcMain.handlers['save-game-card']({}, { id: '', rules: [] });

    expect(result.success).toBe(false);
    expect(result.error).toContain('safe id');
    errorSpy.mockRestore();
  });

  test('save with missing id field is rejected', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await ipcMain.handlers['save-game-card']({}, { rules: [] });

    expect(result.success).toBe(false);
    expect(result.error).toContain('safe id');
    errorSpy.mockRestore();
  });

  test('get non-existent card returns null card', async () => {
    const result = await ipcMain.handlers['get-game-card']({}, 'non-existent-card');

    expect(result.success).toBe(true);
    expect(result.card).toBe(null);
  });
});
