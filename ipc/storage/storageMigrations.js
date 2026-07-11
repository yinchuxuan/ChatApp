const path = require('path');
const sessions = require('../chatSessionStore');
const { getCardPath, isSafeGameCardId } = require('../gameCardStorage');
const { migrateLegacyLocalUrl } = require('../backgroundHandlers');

async function firstExisting(store, paths) {
  for (const filePath of [].concat(paths || [])) {
    if (filePath && await store.exists(filePath)) return filePath;
  }
  return null;
}

async function migrateJsonFile(store, targetPath, legacyPaths, transform = value => value) {
  const targetExists = await store.exists(targetPath);
  const sourcePath = targetExists ? targetPath : await firstExisting(store, legacyPaths);
  if (!sourcePath) return;
  const value = await store.readJson(sourcePath);
  const migrated = transform(value);
  if (!targetExists || migrated !== value) await store.writeJson(targetPath, migrated);
}

async function migrateLegacyGameCards(store, gameCardsDir, legacyGameCardsDir) {
  if (!legacyGameCardsDir || !(await store.exists(legacyGameCardsDir))) return;
  await store.ensureDir(gameCardsDir);
  for (const name of ['active.json', 'cards']) {
    const sourcePath = path.join(legacyGameCardsDir, name);
    const targetPath = path.join(gameCardsDir, name);
    if (await store.exists(sourcePath) && !(await store.exists(targetPath))) {
      if (name === 'cards') await store.io.cp(sourcePath, targetPath, { recursive: true });
      else await store.writeJson(targetPath, await store.readJson(sourcePath));
    }
  }
}

async function migrateFlatCardFiles(store, gameCardsDir) {
  const cardsDir = path.join(gameCardsDir, 'cards');
  await store.ensureDir(cardsDir);
  let names;
  try {
    names = await store.io.readdir(cardsDir);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const id = path.basename(name, '.json');
    if (!isSafeGameCardId(id)) continue;
    const targetPath = getCardPath(cardsDir, id);
    if (!(await store.exists(targetPath))) {
      await store.writeJson(targetPath, await store.readJson(path.join(cardsDir, name)));
    }
  }
}

async function migrateLegacyChat(store, gameCardsDir, legacyPaths) {
  const context = await sessions.getActiveSessionContext(store, gameCardsDir);
  if (await store.exists(context.messagesPath)) return;
  const sourcePath = await firstExisting(store, legacyPaths);
  if (!sourcePath) return;
  await store.writeJson(context.messagesPath, await store.readJson(sourcePath));
  const activePath = path.join(context.sessionRoot, 'active.json');
  if (!(await store.exists(activePath))) await store.writeJson(activePath, { id: context.id });
}

async function runMigration(name, operation, logger) {
  try {
    await operation();
  } catch (error) {
    logger.warn(`Storage migration failed (${name}):`, error);
  }
}

async function runStorageMigrations({ store, fs, pathLib, paths, logger = console }) {
  await runMigration('model config', () => migrateJsonFile(
    store,
    paths.modelConfigPath,
    paths.legacy.modelConfigPaths
  ), logger);
  await runMigration('background config', () => migrateJsonFile(
    store,
    paths.backgroundConfigPath,
    paths.legacy.backgroundConfigPaths,
    value => migrateLegacyLocalUrl(fs, pathLib, value)
  ), logger);
  await runMigration('legacy game cards', () => migrateLegacyGameCards(
    store,
    paths.gameCardsDir,
    paths.legacyGameCardsDir
  ), logger);
  await runMigration('flat game cards', () => migrateFlatCardFiles(store, paths.gameCardsDir), logger);
  await runMigration('chat history', () => migrateLegacyChat(
    store,
    paths.gameCardsDir,
    paths.legacy.chatHistoryPaths
  ), logger);
}

module.exports = {
  migrateFlatCardFiles,
  migrateJsonFile,
  migrateLegacyChat,
  migrateLegacyGameCards,
  runStorageMigrations
};
