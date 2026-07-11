const { IMAGE_EXTENSIONS } = require('./gameCardAssets');
const { USER_BACKGROUND_URL } = require('./localResourceProtocol');

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp'
};

function ensureParentDir(fs, pathLib, filePath) {
  const dir = pathLib.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function findExistingPath(fs, paths) {
  return paths.find(filePath => filePath && fs.existsSync(filePath));
}

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

function readConfig(fs, pathLib, configPath, legacyConfigPath) {
  let config;
  let shouldPersist = false;
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } else {
    const legacyPath = findExistingPath(fs, [].concat(legacyConfigPath || []));
    if (!legacyPath) return { backgroundImageUrl: '', backgroundOpacity: 0.5 };
    config = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
    shouldPersist = true;
  }
  const migrated = migrateLegacyLocalUrl(fs, pathLib, config);
  if (migrated !== config || shouldPersist) {
    ensureParentDir(fs, pathLib, configPath);
    fs.writeFileSync(configPath, JSON.stringify(migrated, null, 2), 'utf-8');
  }
  return migrated;
}

function registerBackgroundHandlers(ipcMain, backgroundConfigPath, fs, path, dialog, legacyBackgroundConfigPath) {
  let selectedBackgroundPath = null;

  ipcMain.handle('get-background-config', () => {
    try {
      const config = readConfig(fs, path, backgroundConfigPath, legacyBackgroundConfigPath);
      return { success: true, config: publicConfig(config) };
    } catch (err) {
      console.error('Error reading background config:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-background-config', (event, config) => {
    try {
      const storedConfig = { ...config };
      if (storedConfig.backgroundImageUrl === USER_BACKGROUND_URL) {
        const existing = readConfig(fs, path, backgroundConfigPath, legacyBackgroundConfigPath);
        const filePath = selectedBackgroundPath || existing.backgroundImagePath;
        storedConfig.backgroundImagePath = validateBackgroundPath(fs, path, filePath);
      } else {
        if (String(storedConfig.backgroundImageUrl || '').startsWith('local://')) {
          throw new Error('Local background URL is not authorized');
        }
        delete storedConfig.backgroundImagePath;
      }
      ensureParentDir(fs, path, backgroundConfigPath);
      fs.writeFileSync(backgroundConfigPath, JSON.stringify(storedConfig, null, 2), 'utf-8');
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
      return { success: false, error: err.message };
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
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerBackgroundHandlers };
