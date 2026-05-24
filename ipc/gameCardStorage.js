const path = require('path');

function ensureGameCardDirs(fs, gameCardsDir) {
  const cardsDir = path.join(gameCardsDir, 'cards');
  if (!fs.existsSync(cardsDir)) {
    fs.mkdirSync(cardsDir, { recursive: true });
  }
  return cardsDir;
}

function isSafeGameCardId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id);
}

function getCardPath(cardsDir, id) {
  if (!isSafeGameCardId(id)) {
    throw new Error('Invalid game card id');
  }
  return path.join(cardsDir, id + '.json');
}

function readJsonFile(fs, filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJsonFile(fs, filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

module.exports = {
  ensureGameCardDirs,
  getCardPath,
  isSafeGameCardId,
  readJsonFile,
  writeJsonFile
};
