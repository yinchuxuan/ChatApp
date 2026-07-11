const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerBackgroundHandlers } = require('../../ipc/backgroundHandlers');
const {
  USER_BACKGROUND_URL,
  createGameCardResourceUrl,
  registerLocalResourceProtocol,
  resolveLocalResourcePath
} = require('../../ipc/localResourceProtocol');

function createIpcMain() {
  const handlers = {};
  return { handlers, handle: (channel, handler) => { handlers[channel] = handler; } };
}

describe('Controlled local resource protocol', () => {
  let tempDir;
  let dependencies;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-local-resource-'));
    const cardsDir = path.join(tempDir, 'game-cards', 'cards');
    const activePath = path.join(tempDir, 'game-cards', 'active.json');
    const backgroundConfigPath = path.join(tempDir, 'config', 'background.json');
    fs.mkdirSync(path.join(cardsDir, 'active-card', 'images'), { recursive: true });
    fs.mkdirSync(path.join(cardsDir, 'active-card', 'audio'), { recursive: true });
    fs.writeFileSync(path.join(cardsDir, 'active-card', 'images', 'school.jpg'), 'image');
    fs.writeFileSync(path.join(cardsDir, 'active-card', 'audio', 'theme.ogg'), 'audio');
    fs.writeFileSync(activePath, JSON.stringify({ id: 'active-card' }));
    dependencies = { fs, cardsDir, activePath, backgroundConfigPath };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('resolves image and audio from the active installed card', () => {
    const imageUrl = createGameCardResourceUrl('active-card', 'image', 'images/school.jpg');
    const audioUrl = createGameCardResourceUrl('active-card', 'audio', 'audio/theme.ogg');

    expect(resolveLocalResourcePath(imageUrl, dependencies))
      .toBe(fs.realpathSync(path.join(dependencies.cardsDir, 'active-card', 'images', 'school.jpg')));
    expect(resolveLocalResourcePath(audioUrl, dependencies))
      .toBe(fs.realpathSync(path.join(dependencies.cardsDir, 'active-card', 'audio', 'theme.ogg')));
  });

  test('rejects arbitrary paths, inactive cards, and invalid extensions', () => {
    fs.writeFileSync(path.join(dependencies.cardsDir, 'active-card', 'images', 'note.txt'), 'text');

    expect(() => resolveLocalResourcePath('local:///etc/passwd', dependencies)).toThrow('not authorized');
    expect(() => resolveLocalResourcePath(
      'local://game-card/other-card/image/images/school.jpg', dependencies
    )).toThrow('not authorized');
    expect(() => resolveLocalResourcePath(
      'local://game-card/active-card/image/images/note.txt', dependencies
    )).toThrow('image path must use');
    expect(() => resolveLocalResourcePath(
      'local://game-card/active-card/image/../secret.jpg', dependencies
    )).toThrow();
  });

  test('returns a file-not-found protocol error for unauthorized URLs', () => {
    let handler;
    const protocol = { registerFileProtocol: (_scheme, callback) => { handler = callback; } };
    registerLocalResourceProtocol(protocol, dependencies);
    const callback = jest.fn();

    handler({ url: 'local:///etc/passwd' }, callback);

    expect(callback).toHaveBeenCalledWith({ error: -6 });
  });

  test('rejects a symlink that leaves the installed card directory', () => {
    const outsidePath = path.join(tempDir, 'outside.jpg');
    const linkPath = path.join(dependencies.cardsDir, 'active-card', 'images', 'outside.jpg');
    fs.writeFileSync(outsidePath, 'outside');
    fs.symlinkSync(outsidePath, linkPath);
    const url = createGameCardResourceUrl('active-card', 'image', 'images/outside.jpg');

    expect(() => resolveLocalResourcePath(url, dependencies)).toThrow('stay inside');
  });

  test('only resolves the user background recorded in current config', () => {
    const imagePath = path.join(tempDir, 'selected.png');
    fs.mkdirSync(path.dirname(dependencies.backgroundConfigPath), { recursive: true });
    fs.writeFileSync(imagePath, 'image');
    fs.writeFileSync(dependencies.backgroundConfigPath, JSON.stringify({
      backgroundImageUrl: USER_BACKGROUND_URL,
      backgroundImagePath: imagePath,
      backgroundOpacity: 0.5
    }));

    expect(resolveLocalResourcePath(USER_BACKGROUND_URL, dependencies)).toBe(fs.realpathSync(imagePath));
    expect(() => resolveLocalResourcePath('local://user-background/other', dependencies)).toThrow();

    const textPath = path.join(tempDir, 'not-image.txt');
    fs.writeFileSync(textPath, 'text');
    fs.writeFileSync(dependencies.backgroundConfigPath, JSON.stringify({
      backgroundImageUrl: USER_BACKGROUND_URL,
      backgroundImagePath: textPath
    }));
    expect(() => resolveLocalResourcePath(USER_BACKGROUND_URL, dependencies)).toThrow('extension');

    fs.writeFileSync(dependencies.backgroundConfigPath, JSON.stringify({
      backgroundImageUrl: '',
      backgroundImagePath: imagePath
    }));
    expect(() => resolveLocalResourcePath(USER_BACKGROUND_URL, dependencies)).toThrow('not authorized');
  });

  test('selects and stores a user background without exposing its path', async () => {
    const imagePath = path.join(tempDir, 'selected.webp');
    fs.writeFileSync(imagePath, 'image');
    const ipcMain = createIpcMain();
    const dialog = { showOpenDialog: jest.fn().mockResolvedValue({ canceled: false, filePaths: [imagePath] }) };
    registerBackgroundHandlers(ipcMain, dependencies.backgroundConfigPath, fs, path, dialog, []);

    const selected = await ipcMain.handlers['select-background-image']();
    const event = { sender: { getOwnerBrowserWindow: () => null } };
    const saved = await ipcMain.handlers['save-background-config'](event, {
      backgroundImageUrl: selected.localUrl,
      backgroundOpacity: 0.6
    });
    const stored = JSON.parse(fs.readFileSync(dependencies.backgroundConfigPath, 'utf-8'));

    expect(selected).toEqual({ success: true, localUrl: USER_BACKGROUND_URL, mimeType: 'image/webp' });
    expect(saved.config.backgroundImagePath).toBeUndefined();
    expect(stored.backgroundImagePath).toBe(fs.realpathSync(imagePath));
  });

  test('migrates a legacy absolute local background URL', async () => {
    const imagePath = path.join(tempDir, 'legacy.jpg');
    fs.writeFileSync(imagePath, 'image');
    fs.mkdirSync(path.dirname(dependencies.backgroundConfigPath), { recursive: true });
    fs.writeFileSync(dependencies.backgroundConfigPath, JSON.stringify({
      backgroundImageUrl: `local://${imagePath}`,
      backgroundOpacity: 0.4
    }));
    const ipcMain = createIpcMain();
    registerBackgroundHandlers(ipcMain, dependencies.backgroundConfigPath, fs, path, {}, []);

    const result = await ipcMain.handlers['get-background-config']();
    const stored = JSON.parse(fs.readFileSync(dependencies.backgroundConfigPath, 'utf-8'));

    expect(result.config).toEqual({ backgroundImageUrl: USER_BACKGROUND_URL, backgroundOpacity: 0.4 });
    expect(stored.backgroundImagePath).toBe(fs.realpathSync(imagePath));
  });
});
