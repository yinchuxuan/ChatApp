const path = require('path');
const { getCardAssetPath, getCardAudioPath, getCardImagePath } = require('./gameCardAssets');
const {
  ensureGameCardDirs,
  getCardPath,
  isSafeGameCardId,
  readJsonFile,
  writeJsonFile
} = require('./gameCardStorage');
const { readGameCardJson } = require('./gameCardImportResolver');
const { validateGameCard } = require('../src/gameCard/validateGameCard');

function asErrorResult(err, fallback = {}) {
  console.error('Error handling game card IPC:', err);
  return { success: false, error: err.message, ...fallback };
}

function readCard(fs, cardsDir, id) {
  const cardPath = getCardPath(cardsDir, id);
  return readGameCardJson(fs, cardPath, null);
}

function listCardIds(fs, cardsDir) {
  if (!fs.existsSync(cardsDir)) return [];
  return fs.readdirSync(cardsDir)
    .filter(name => isSafeGameCardId(name) && fs.existsSync(getCardPath(cardsDir, name)))
    .sort();
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

function readImportCard(fs, selectedDir) {
  const cardPath = path.join(selectedDir, 'card.json');
  if (!fs.existsSync(cardPath)) throw new Error('Selected folder must contain card.json');

  const card = readGameCardJson(fs, cardPath);
  if (!card || !isSafeGameCardId(card.id)) {
    throw new Error('Game card must have a safe id');
  }
  const validation = validateGameCard(card);
  if (!validation.valid) {
    throw new Error('card.json does not match game card schema: ' + validation.errors.join('; '));
  }
  return card;
}

function copyCardDirectory(fs, sourceDir, targetDir) {
  const sourceReal = fs.realpathSync(sourceDir);
  const targetReal = fs.existsSync(targetDir) ? fs.realpathSync(targetDir) : null;
  if (targetReal && sourceReal === targetReal) return;
  if (fs.existsSync(targetDir)) fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
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

  ipcMain.handle('import-game-card-from-directory', async () => {
    try {
      if (!dialog || typeof dialog.showOpenDialog !== 'function') {
        throw new Error('File dialog is not available');
      }
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return { success: false, canceled: true, card: null };
      }
      const selectedDir = result.filePaths[0];
      const card = readImportCard(fs, selectedDir);
      copyCardDirectory(fs, selectedDir, path.join(cardsDir, card.id));
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

  ipcMain.handle('get-game-card-audio-url', (event, relativePath) => {
    try {
      const active = readJsonFile(fs, activePath, { id: null });
      if (!active?.id) throw new Error('No active game card');
      const filePath = getCardAudioPath(fs, cardsDir, active.id, relativePath);
      return { success: true, url: `local://${filePath}`, path: filePath };
    } catch (err) {
      return asErrorResult(err, { url: '' });
    }
  });

  ipcMain.handle('get-game-card-image-url', (event, relativePath) => {
    try {
      const active = readJsonFile(fs, activePath, { id: null });
      if (!active?.id) throw new Error('No active game card');
      const filePath = getCardImagePath(fs, cardsDir, active.id, relativePath);
      return { success: true, url: `local://${filePath}`, path: filePath };
    } catch (err) {
      return asErrorResult(err, { url: '' });
    }
  });
}

module.exports = { registerGameCardHandlers };
