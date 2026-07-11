const path = require('path');
const { getCardAssetPath, getCardAudioPath, getCardImagePath } = require('./gameCardAssets');
const { copyCardDirectory } = require('./gameCardDirectoryCopy');
const { getCardPath, isSafeGameCardId } = require('./gameCardStorage');
const { readGameCardJsonAsync } = require('./gameCardImportResolver');
const { validateImportedGameCard } = require('./gameCardImportValidation');
const { createGameCardResourceUrl } = require('./localResourceProtocol');
const { createJsonStore } = require('./storage/jsonStore');

function asErrorResult(err, fallback = {}) {
  console.error('Error handling game card IPC:', err);
  return {
    success: false,
    error: err.message,
    ...(err.stage ? { stage: err.stage } : {}),
    ...(err.file ? { file: err.file } : {}),
    ...(err.details ? { details: err.details } : {}),
    ...fallback
  };
}

async function readCard(store, cardsDir, id) {
  return readGameCardJsonAsync(store, getCardPath(cardsDir, id), null);
}

async function listCardIds(store, cardsDir) {
  if (!(await store.exists(cardsDir))) return [];
  const names = await store.io.readdir(cardsDir);
  const checks = await Promise.all(names.map(async name => (
    isSafeGameCardId(name) && await store.exists(getCardPath(cardsDir, name)) ? name : null
  )));
  return checks.filter(Boolean).sort();
}

async function readImportCard(fs, store, selectedDir) {
  const cardPath = path.join(selectedDir, 'card.json');
  if (!(await store.exists(cardPath))) throw new Error('Selected folder must contain card.json');
  const card = await readGameCardJsonAsync(store, cardPath);
  if (!card || !isSafeGameCardId(card.id)) throw new Error('Game card must have a safe id');
  await validateImportedGameCard(store, card, selectedDir);
  return card;
}

function registerGameCardHandlers(ipcMain, gameCardsDir, fs, dialog, options = {}) {
  const store = options.store || createJsonStore(fs);
  const cardsDir = path.join(gameCardsDir, 'cards');
  const activePath = path.join(gameCardsDir, 'active.json');

  ipcMain.handle('get-game-cards', async () => {
    try {
      const ids = await listCardIds(store, cardsDir);
      const cards = (await Promise.all(ids.map(id => readCard(store, cardsDir, id)))).filter(Boolean);
      return { success: true, cards };
    } catch (err) {
      return asErrorResult(err, { cards: [] });
    }
  });

  ipcMain.handle('get-game-card', async (event, id) => {
    try {
      return { success: true, card: await readCard(store, cardsDir, id) };
    } catch (err) {
      return asErrorResult(err, { card: null });
    }
  });

  ipcMain.handle('save-game-card', async (event, card) => {
    try {
      if (!card || !isSafeGameCardId(card.id)) throw new Error('Game card must have a safe id');
      await store.writeJson(getCardPath(cardsDir, card.id), card);
      return { success: true };
    } catch (err) {
      return asErrorResult(err);
    }
  });

  ipcMain.handle('import-game-card-from-directory', async () => {
    try {
      if (!dialog || typeof dialog.showOpenDialog !== 'function') throw new Error('File dialog is not available');
      const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
      if (result.canceled || !result.filePaths?.length) {
        return { success: false, canceled: true, card: null };
      }
      const selectedDir = result.filePaths[0];
      const card = await readImportCard(fs, store, selectedDir);
      await store.ensureDir(cardsDir);
      await copyCardDirectory(store, selectedDir, path.join(cardsDir, card.id));
      await store.writeJson(activePath, { id: card.id });
      return { success: true, card };
    } catch (err) {
      return asErrorResult(err, { card: null });
    }
  });

  ipcMain.handle('set-active-game-card', async (event, id) => {
    try {
      if (id === null || id === '') {
        await store.writeJson(activePath, { id: null });
        return { success: true };
      }
      if (!(await readCard(store, cardsDir, id))) throw new Error('Game card not found');
      await store.writeJson(activePath, { id });
      return { success: true };
    } catch (err) {
      return asErrorResult(err);
    }
  });

  ipcMain.handle('get-active-game-card', async () => {
    try {
      const active = await store.readJson(activePath, { id: null });
      const card = active?.id ? await readCard(store, cardsDir, active.id) : null;
      return { success: true, card };
    } catch (err) {
      return asErrorResult(err, { card: null });
    }
  });

  ipcMain.handle('read-game-card-file', async (event, id, relativePath) => {
    try {
      const filePath = getCardAssetPath(fs, cardsDir, id, relativePath);
      return { success: true, content: await store.readText(filePath) };
    } catch (err) {
      return asErrorResult(err, { content: '' });
    }
  });

  ipcMain.handle('get-game-card-audio-url', async (event, cardId, relativePath) => {
    try {
      const active = await store.readJson(activePath, { id: null });
      if (!active?.id || active.id !== cardId) throw new Error('Game card is not active');
      getCardAudioPath(fs, cardsDir, cardId, relativePath);
      return { success: true, url: createGameCardResourceUrl(cardId, 'audio', relativePath) };
    } catch (err) {
      return asErrorResult(err, { url: '' });
    }
  });

  ipcMain.handle('get-game-card-image-url', async (event, cardId, relativePath) => {
    try {
      const active = await store.readJson(activePath, { id: null });
      if (!active?.id || active.id !== cardId) throw new Error('Game card is not active');
      getCardImagePath(fs, cardsDir, cardId, relativePath);
      return { success: true, url: createGameCardResourceUrl(cardId, 'image', relativePath) };
    } catch (err) {
      return asErrorResult(err, { url: '' });
    }
  });
}

module.exports = { registerGameCardHandlers };
