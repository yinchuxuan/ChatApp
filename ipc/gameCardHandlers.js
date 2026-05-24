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

function listCardIds(fs, cardsDir) {
  if (!fs.existsSync(cardsDir)) return [];
  return fs.readdirSync(cardsDir)
    .filter(name => isSafeGameCardId(name) && fs.existsSync(getCardPath(cardsDir, name)))
    .sort();
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

function migrateLegacyCards(fs, gameCardsDir, legacyGameCardsDir) {
  if (!legacyGameCardsDir || !fs.existsSync(legacyGameCardsDir)) {
    return;
  }
  if (!fs.existsSync(gameCardsDir)) {
    fs.mkdirSync(gameCardsDir, { recursive: true });
  }
  ['active.json', 'cards'].forEach(name => {
    const sourcePath = path.join(legacyGameCardsDir, name);
    const targetPath = path.join(gameCardsDir, name);
    if (fs.existsSync(sourcePath) && !fs.existsSync(targetPath)) {
      fs.cpSync(sourcePath, targetPath, { recursive: true });
    }
  });
}

function migrateFlatCardFiles(fs, cardsDir) {
  if (!fs.existsSync(cardsDir)) return;
  fs.readdirSync(cardsDir).forEach(name => {
    if (!name.endsWith('.json')) return;
    const id = path.basename(name, '.json');
    if (!isSafeGameCardId(id)) return;
    const legacyPath = path.join(cardsDir, name);
    const cardPath = getCardPath(cardsDir, id);
    if (!fs.existsSync(cardPath)) {
      writeJsonFile(fs, cardPath, readJsonFile(fs, legacyPath, null));
    }
  });
}

function registerGameCardHandlers(ipcMain, gameCardsDir, fs, dialog, legacyGameCardsDir) {
  migrateLegacyCards(fs, gameCardsDir, legacyGameCardsDir);
  const cardsDir = ensureGameCardDirs(fs, gameCardsDir);
  migrateFlatCardFiles(fs, cardsDir);
  const activePath = path.join(gameCardsDir, 'active.json');

  ipcMain.handle('get-game-cards', () => {
    try {
      const cards = listCardIds(fs, cardsDir).map(id => readCard(fs, cardsDir, id)).filter(Boolean);
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
