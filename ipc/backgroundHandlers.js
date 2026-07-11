const { IMAGE_EXTENSIONS } = require('./gameCardAssets');
const { USER_BACKGROUND_URL } = require('./localResourceProtocol');
const { createJsonStore } = require('./storage/jsonStore');
const { failureResult } = require('./ipcResult');

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
};

function validateBackgroundPath(fs, pathLib, filePath) {
  if (typeof filePath !== 'string' || !pathLib.isAbsolute(filePath)) {
    throw new Error('Background image path must be absolute');
  }
  const extension = pathLib.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) throw new Error('Unsupported background image type');
  if (!fs.existsSync(filePath)) throw new Error('File not found');
  const realPath = fs.realpathSync(filePath);
  if (!fs.statSync(realPath).isFile()) throw new Error('Background image must be a file');
  return realPath;
}

function migrateLegacyLocalUrl(fs, pathLib, config) {
  const url = config?.backgroundImageUrl;
  if (typeof url !== 'string' || !url.startsWith('local://') || url === USER_BACKGROUND_URL) {
    return config;
  }
  try {
    const filePath = validateBackgroundPath(fs, pathLib, decodeURIComponent(url.slice(8)));
    return { ...config, backgroundImageUrl: USER_BACKGROUND_URL, backgroundImagePath: filePath };
  } catch {
    return { ...publicConfig(config), backgroundImageUrl: '' };
  }
}

function publicConfig(config) {
  const result = { ...config };
  delete result.backgroundImagePath;
  return result;
}

function registerBackgroundHandlers(ipcMain, backgroundConfigPath, fs, path, dialog, options = {}) {
  const store = options.store || createJsonStore(fs);
  let selectedBackgroundPath = null;

  ipcMain.handle('get-background-config', async () => {
    try {
      const config = await store.readJson(backgroundConfigPath, { backgroundImageUrl: '', backgroundOpacity: 0.5 });
      return { success: true, config: publicConfig(config) };
    } catch (err) {
      console.error('Error reading background config:', err);
      return failureResult(err);
    }
  });

  ipcMain.handle('save-background-config', async (event, config) => {
    try {
      const storedConfig = { ...config };
      if (storedConfig.backgroundImageUrl === USER_BACKGROUND_URL) {
        const existing = await store.readJson(backgroundConfigPath, {});
        const filePath = selectedBackgroundPath || existing.backgroundImagePath;
        storedConfig.backgroundImagePath = validateBackgroundPath(fs, path, filePath);
      } else {
        if (String(storedConfig.backgroundImageUrl || '').startsWith('local://')) {
          throw new Error('Local background URL is not authorized');
        }
        delete storedConfig.backgroundImagePath;
      }
      await store.writeJson(backgroundConfigPath, storedConfig);
      selectedBackgroundPath = null;
      const visibleConfig = publicConfig(storedConfig);
      try {
        const win = event.sender.getOwnerBrowserWindow();
        if (win && win.webContents) {
          win.webContents.send('background-config-changed', visibleConfig);
        }
      } catch (notifyErr) {
        // Ignore notification errors (e.g., in tests with mock events)
        console.warn('Failed to notify renderer of background config change:', notifyErr.message);
      }
      return { success: true, config: visibleConfig };
    } catch (err) {
      console.error('Error saving background config:', err);
      return failureResult(err);
    }
  });

  ipcMain.handle('select-background-image', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择背景图片',
        filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }],
        properties: ['openFile']
      });
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }
      const filePath = validateBackgroundPath(fs, path, result.filePaths[0]);
      const ext = path.extname(filePath).toLowerCase();
      selectedBackgroundPath = filePath;
      return { success: true, localUrl: USER_BACKGROUND_URL, mimeType: MIME_TYPES[ext] };
    } catch (err) {
      return failureResult(err);
    }
  });
}

module.exports = { migrateLegacyLocalUrl, registerBackgroundHandlers, validateBackgroundPath };
