// Config IPC Handlers
// Handles model configuration persistence

function registerConfigHandlers(ipcMain, configPath, fs) {
  ipcMain.handle('get-model-config', () => {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        return { success: true, config: JSON.parse(content) };
      }
      return { success: true, config: { apiUrl: '', apiKey: '', modelName: '' } };
    } catch (err) {
      console.error('Error reading model config:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-model-config', (event, config) => {
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('Error saving model config:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerConfigHandlers };