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

  test('rejects invalid external state schema with readable details', async () => {
    const badDir = path.join(tempDir, 'bad-state-schema-card');
    fs.mkdirSync(path.join(badDir, 'state'), { recursive: true });
    fs.writeFileSync(path.join(badDir, 'card.json'), JSON.stringify({
      version: '1.0',
      id: 'bad_state_schema',
      name: 'Bad State Schema',
      stateSchema: 'state/schema.json',
      rules: [rule('start')]
    }), 'utf-8');
    fs.writeFileSync(path.join(badDir, 'state/schema.json'), JSON.stringify({
      'timeline.currentTime': { type: 'string', default: 0 }
    }), 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [badDir] });

    const result = await ipcMain.handlers['import-game-card-from-directory']();

    expect(result.success).toBe(false);
    expect(result.stage).toBe('validate_state_schema');
    expect(result.file).toBe('state/schema.json');
    expect(result.details[0]).toMatchObject({
      file: 'state/schema.json',
      message: 'schema.timeline.currentTime.default: must be a string'
    });
  });

  test('expands imported rules in declaration order', async () => {
    const cardDir = path.join(tempDir, 'ordered-import-card');
    const card = {
      version: '1.0',
      id: 'ordered_import',
      name: 'Ordered Import',
      rules: [
        rule('first'),
        { $import: 'rules/middle.json' },
        rule('last')
      ]
    };
    fs.mkdirSync(path.join(cardDir, 'rules'), { recursive: true });
    fs.writeFileSync(path.join(cardDir, 'card.json'), JSON.stringify(card), 'utf-8');
    fs.writeFileSync(path.join(cardDir, 'rules', 'middle.json'), JSON.stringify([
      rule('imported-a'),
      rule('imported-b')
    ]), 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [cardDir] });

    const importResult = await ipcMain.handlers['import-game-card-from-directory']();
    const activeResult = await ipcMain.handlers['get-active-game-card']();

    expect(importResult.success).toBe(true);
    expect(importResult.card.rules.map(item => item.id)).toEqual([
      'first', 'imported-a', 'imported-b', 'last'
    ]);
    expect(activeResult.card.rules.map(item => item.id)).toEqual([
      'first', 'imported-a', 'imported-b', 'last'
    ]);
  });

  test('expands imported audio visual display and content file configs', async () => {
    const cardDir = path.join(tempDir, 'asset-import-card');
    fs.mkdirSync(cardDir, { recursive: true });
    fs.writeFileSync(path.join(cardDir, 'card.json'), JSON.stringify({
      version: '1.0',
      id: 'asset_import',
      name: 'Asset Import',
      audio: { $import: 'audio.json' },
      visual: { $import: 'visual.json' },
      files: { $import: 'files.json' },
      display: { $import: 'display.json' },
      rules: [rule('start')]
    }), 'utf-8');
    fs.writeFileSync(path.join(cardDir, 'audio.json'), JSON.stringify({
      bgm: { daily: 'audio/daily.mp3' }
    }), 'utf-8');
    fs.writeFileSync(path.join(cardDir, 'visual.json'), JSON.stringify({
      background: { school: 'images/school.jpg' }
    }), 'utf-8');
    fs.writeFileSync(path.join(cardDir, 'files.json'), JSON.stringify({
      roleplay_rules: 'roleplay_rules.md'
    }), 'utf-8');
    fs.writeFileSync(path.join(cardDir, 'display.json'), JSON.stringify({
      stylesheet: 'display.css'
    }), 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [cardDir] });

    const importResult = await ipcMain.handlers['import-game-card-from-directory']();
    const activeResult = await ipcMain.handlers['get-active-game-card']();

    expect(importResult.success).toBe(true);
    expect(activeResult.card.audio.bgm.daily).toBe('audio/daily.mp3');
    expect(activeResult.card.visual.background.school).toBe('images/school.jpg');
    expect(activeResult.card.files.roleplay_rules).toBe('roleplay_rules.md');
    expect(activeResult.card.display.stylesheet).toBe('display.css');
  });

  test('rejects unsafe import paths', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const cardDir = path.join(tempDir, 'unsafe-import-card');
    fs.mkdirSync(cardDir, { recursive: true });
    fs.writeFileSync(path.join(cardDir, 'card.json'), JSON.stringify({
      version: '1.0',
      id: 'unsafe_import',
      name: 'Unsafe Import',
      rules: [{ $import: '../outside.json' }]
    }), 'utf-8');
    dialog.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [cardDir] });

    const result = await ipcMain.handlers['import-game-card-from-directory']();

    expect(result.success).toBe(false);
    expect(result.error).toContain('inside game card directory');
    expect(result.card).toBe(null);
    errorSpy.mockRestore();
  });
});

function rule(id) {
  return {
    id,
    when: { phase: 'pre_send' },
    then: [{ type: 'state.set', path: `flags.${id}`, value: true }]
  };
}
