const path = require('path');

function ensureParentDir(fs, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function findExistingPath(fs, paths) {
  return paths.find(filePath => filePath && fs.existsSync(filePath));
}

function readConfig(fs, configPath, legacyConfigPath) {
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  const legacyPath = findExistingPath(fs, [].concat(legacyConfigPath || []));
  if (legacyPath) {
    const config = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
    ensureParentDir(fs, configPath);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return config;
  }
  return { apiUrl: '', apiKey: '', modelName: '' };
}

function registerConfigHandlers(ipcMain, configPath, fs, legacyConfigPath) {
  ipcMain.handle('get-model-config', () => {
    try {
      return { success: true, config: readConfig(fs, configPath, legacyConfigPath) };
    } catch (err) {
      console.error('Error reading model config:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-model-config', (event, config) => {
    try {
      ensureParentDir(fs, configPath);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      return { success: true };
    } catch (err) {
      console.error('Error saving model config:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerConfigHandlers };
