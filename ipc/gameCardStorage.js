const path = require('path');

function isSafeGameCardId(id) {
  return typeof id === 'string' && /^[A-Za-z0-9_-]+$/.test(id);
}

function getCardPath(cardsDir, id) {
  if (!isSafeGameCardId(id)) {
    throw new Error('Invalid game card id');
  }
  return path.join(cardsDir, id, 'card.json');
}

module.exports = {
  getCardPath,
  isSafeGameCardId
};
