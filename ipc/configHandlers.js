const { createJsonStore } = require('./storage/jsonStore');

const DEFAULT_CONFIG = { apiUrl: '', apiKey: '', modelName: '' };

function registerConfigHandlers(ipcMain, configPath, fs, options = {}) {
  const store = options.store || createJsonStore(fs);

  ipcMain.handle('get-model-config', async () => {
    try {
      return { success: true, config: await store.readJson(configPath, DEFAULT_CONFIG) };
    } catch (err) {
      console.error('Error reading model config:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-model-config', async (event, config) => {
    try {
      await store.writeJson(configPath, config);
      return { success: true };
    } catch (err) {
      console.error('Error saving model config:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { DEFAULT_CONFIG, registerConfigHandlers };
