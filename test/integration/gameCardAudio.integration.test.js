const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerGameCardHandlers } = require('../../ipc/gameCardHandlers');

function createIpcMain() {
  const handlers = {};
  return { handlers, handle: (channel, handler) => { handlers[channel] = handler; } };
}

describe('Game Card Audio IPC', () => {
  let tempDir;
  let ipcMain;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-game-card-audio-'));
    ipcMain = createIpcMain();
    registerGameCardHandlers(ipcMain, path.join(tempDir, 'game-cards'), fs, { showOpenDialog: jest.fn() });
    const card = { id: 'audio-card', name: 'Audio Card', rules: [] };
    await ipcMain.handlers['save-game-card']({}, card);
    await ipcMain.handlers['set-active-game-card']({}, card.id);
    const audioPath = path.join(tempDir, 'game-cards', 'cards', card.id, 'audio', 'intro.mp3');
    fs.mkdirSync(path.dirname(audioPath), { recursive: true });
    fs.writeFileSync(audioPath, 'mp3-data', 'utf-8');
    fs.writeFileSync(path.join(path.dirname(audioPath), 'note.txt'), 'not audio', 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns a local URL for active card audio', async () => {
    const result = await ipcMain.handlers['get-game-card-audio-url']({}, 'audio/intro.mp3');

    expect(result.success).toBe(true);
    expect(result.url).toContain('local://');
    expect(result.path.endsWith(path.join('audio-card', 'audio', 'intro.mp3'))).toBe(true);
  });

  test('rejects traversal and non-audio paths', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const traversal = await ipcMain.handlers['get-game-card-audio-url']({}, '../secret.mp3');
    const nonAudio = await ipcMain.handlers['get-game-card-audio-url']({}, 'audio/note.txt');

    expect(traversal.success).toBe(false);
    expect(traversal.error).toContain('stay inside game card directory');
    expect(nonAudio.success).toBe(false);
    expect(nonAudio.error).toContain('audio path must use');
    errorSpy.mockRestore();
  });
});
