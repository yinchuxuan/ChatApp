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

function registerGameCardHandlers(ipcMain, gameCardsDir, fs) {
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
}

module.exports = { registerGameCardHandlers };
