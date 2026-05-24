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

function readConfig(fs, pathLib, configPath, legacyConfigPath) {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  const legacyPath = findExistingPath(fs, [].concat(legacyConfigPath || []));
  if (legacyPath) {
    const config = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
    ensureParentDir(fs, pathLib, configPath);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return config;
  }
  return { backgroundImageUrl: '', backgroundOpacity: 0.5 };
}

function registerBackgroundHandlers(ipcMain, backgroundConfigPath, fs, path, dialog, legacyBackgroundConfigPath) {
  ipcMain.handle('get-background-config', () => {
    try {
      const config = readConfig(fs, path, backgroundConfigPath, legacyBackgroundConfigPath);
      return { success: true, config };
    } catch (err) {
      console.error('Error reading background config:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-background-config', (event, config) => {
    try {
      ensureParentDir(fs, path, backgroundConfigPath);
      fs.writeFileSync(backgroundConfigPath, JSON.stringify(config, null, 2), 'utf-8');
      // Notify renderer process of the change
      try {
        const win = event.sender.getOwnerBrowserWindow();
        if (win && win.webContents) {
          win.webContents.send('background-config-changed', config);
        }
      } catch (notifyErr) {
        // Ignore notification errors (e.g., in tests with mock events)
        console.warn('Failed to notify renderer of background config change:', notifyErr.message);
      }
      return { success: true };
    } catch (err) {
      console.error('Error saving background config:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('select-background-image', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择背景图片',
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    return { success: true, filePath: result.filePaths[0] };
  });

  ipcMain.handle('read-background-image', async (event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || 'image/jpeg';

      const localUrl = `local://${filePath}`;
      return { success: true, localUrl, mimeType, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerBackgroundHandlers };
