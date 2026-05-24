const path = require('path');
const {
  ensureGameCardDirs,
  getCardPath,
  isSafeGameCardId,
  readJsonFile,
  writeJsonFile
} = require('./gameCardStorage');

function asErrorResult(err, fallback = {}) {
  console.error('Error handling game card IPC:', err);
  return { success: false, error: err.message, ...fallback };
}

function readCard(fs, cardsDir, id) {
  const cardPath = getCardPath(cardsDir, id);
  return readJsonFile(fs, cardPath, null);
}

function getCardAssetPath(fs, cardsDir, id, relativePath) {
  if (!isSafeGameCardId(id)) throw new Error('Invalid game card id');
  if (path.isAbsolute(relativePath)) throw new Error('file_content path must be relative');
  const baseDir = path.resolve(cardsDir, id);
  const filePath = path.resolve(baseDir, relativePath);
  if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
    throw new Error('file_content path must stay inside game card directory');
  }
  // Resolve symlinks to prevent path traversal via symbolic links
  if (fs.existsSync(filePath)) {
    const realPath = fs.realpathSync(filePath);
    const realBaseDir = fs.existsSync(baseDir) ? fs.realpathSync(baseDir) : baseDir;
    if (realPath !== realBaseDir && !realPath.startsWith(realBaseDir + path.sep)) {
      throw new Error('file_content path must stay inside game card directory');
    }
  }
  if (!fs.existsSync(filePath)) throw new Error('file_content file not found');
  return filePath;
}

function registerGameCardHandlers(ipcMain, gameCardsDir, fs, dialog) {
  const cardsDir = ensureGameCardDirs(fs, gameCardsDir);
  const activePath = path.join(gameCardsDir, 'active.json');

  ipcMain.handle('get-game-cards', () => {
    try {
      const names = fs.existsSync(cardsDir) ? fs.readdirSync(cardsDir).sort() : [];
      const cards = names.filter(name => name.endsWith('.json')).map(name => {
        return readCard(fs, cardsDir, path.basename(name, '.json'));
      }).filter(Boolean);
      return { success: true, cards };
    } catch (err) {
      return asErrorResult(err, { cards: [] });
    }
  });

  ipcMain.handle('get-game-card', (event, id) => {
    try {
      return { success: true, card: readCard(fs, cardsDir, id) };
    } catch (err) {
      return asErrorResult(err, { card: null });
    }
  });

  ipcMain.handle('save-game-card', (event, card) => {
    try {
      if (!card || !isSafeGameCardId(card.id)) {
        throw new Error('Game card must have a safe id');
      }
      writeJsonFile(fs, getCardPath(cardsDir, card.id), card);
      return { success: true };
    } catch (err) {
      return asErrorResult(err);
    }
  });

  ipcMain.handle('import-game-card-from-file', async () => {
    try {
      if (!dialog || typeof dialog.showOpenDialog !== 'function') {
        throw new Error('File dialog is not available');
      }
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Game Card JSON', extensions: ['json'] }]
      });
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true, card: null };
      }
      const card = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
      if (!card || !isSafeGameCardId(card.id)) {
        throw new Error('Game card must have a safe id');
      }
      writeJsonFile(fs, getCardPath(cardsDir, card.id), card);
      writeJsonFile(fs, activePath, { id: card.id });
      return { success: true, card };
    } catch (err) {
      return asErrorResult(err, { card: null });
    }
  });

  ipcMain.handle('set-active-game-card', (event, id) => {
    try {
      if (id === null || id === '') {
        writeJsonFile(fs, activePath, { id: null });
        return { success: true };
      }
      if (!readCard(fs, cardsDir, id)) {
        throw new Error('Game card not found');
      }
      writeJsonFile(fs, activePath, { id });
      return { success: true };
    } catch (err) {
      return asErrorResult(err);
    }
  });

  ipcMain.handle('get-active-game-card', () => {
    try {
      const active = readJsonFile(fs, activePath, { id: null });
      const card = active && active.id ? readCard(fs, cardsDir, active.id) : null;
      return { success: true, card };
    } catch (err) {
      return asErrorResult(err, { card: null });
    }
  });

  ipcMain.handle('read-game-card-file', (event, id, relativePath) => {
    try {
      const filePath = getCardAssetPath(fs, cardsDir, id, relativePath);
      return { success: true, content: fs.readFileSync(filePath, 'utf-8') };
    } catch (err) {
      return asErrorResult(err, { content: '' });
    }
  });
}

module.exports = { registerGameCardHandlers };
