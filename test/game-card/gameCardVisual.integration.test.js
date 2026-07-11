const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerGameCardHandlers } = require('../../ipc/gameCardHandlers');

function createIpcMain() {
  const handlers = {};
  return { handlers, handle: (channel, handler) => { handlers[channel] = handler; } };
}

describe('Game Card Visual IPC', () => {
  let tempDir;
  let ipcMain;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-game-card-visual-'));
    ipcMain = createIpcMain();
    registerGameCardHandlers(ipcMain, path.join(tempDir, 'game-cards'), fs, { showOpenDialog: jest.fn() });
    const card = { id: 'visual-card', name: 'Visual Card', rules: [] };
    await ipcMain.handlers['save-game-card']({}, card);
    await ipcMain.handlers['set-active-game-card']({}, card.id);
    const imagePath = path.join(tempDir, 'game-cards', 'cards', card.id, 'images', 'school.jpg');
    fs.mkdirSync(path.dirname(imagePath), { recursive: true });
    fs.writeFileSync(imagePath, 'jpg-data', 'utf-8');
    fs.writeFileSync(path.join(path.dirname(imagePath), 'note.txt'), 'not image', 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('returns a local URL for active card image', async () => {
    const result = await ipcMain.handlers['get-game-card-image-url']({}, 'visual-card', 'images/school.jpg');

    expect(result.success).toBe(true);
    expect(result.url).toBe('local://game-card/visual-card/image/images/school.jpg');
    expect(result.path).toBeUndefined();
  });

  test('rejects traversal and non-image paths', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const traversal = await ipcMain.handlers['get-game-card-image-url']({}, 'visual-card', '../secret.jpg');
    const nonImage = await ipcMain.handlers['get-game-card-image-url']({}, 'visual-card', 'images/note.txt');

    expect(traversal.success).toBe(false);
    expect(traversal.error).toContain('stay inside game card directory');
    expect(nonImage.success).toBe(false);
    expect(nonImage.error).toContain('image path must use');
    errorSpy.mockRestore();
  });

  test('rejects resources requested for a non-active card', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await ipcMain.handlers['get-game-card-image-url']({}, 'other-card', 'images/school.jpg');
    expect(result).toMatchObject({ success: false, error: 'Game card is not active' });
    errorSpy.mockRestore();
  });
});
