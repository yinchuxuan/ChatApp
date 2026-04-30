// Background IPC Handlers
// Handles background image configuration and file selection

function registerBackgroundHandlers(ipcMain, backgroundConfigPath, fs, path, dialog) {
  ipcMain.handle('get-background-config', () => {
    try {
      if (fs.existsSync(backgroundConfigPath)) {
        const content = fs.readFileSync(backgroundConfigPath, 'utf-8');
        return { success: true, config: JSON.parse(content) };
      }
      return { success: true, config: { backgroundImageUrl: '', backgroundOpacity: 0.5 } };
    } catch (err) {
      console.error('Error reading background config:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-background-config', (event, config) => {
    try {
      fs.writeFileSync(backgroundConfigPath, JSON.stringify(config, null, 2), 'utf-8');
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
      let mimeType;
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.bmp') mimeType = 'image/bmp';
      else mimeType = 'image/jpeg';

      const localUrl = `local://${filePath}`;
      return { success: true, localUrl, mimeType, path: filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerBackgroundHandlers };