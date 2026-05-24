const path = require('path');

function getLegacyUserDataDir(userDataDir) {
  return path.join(path.dirname(userDataDir), 'harness_lab');
}

function getUserDataPaths(userDataDir, legacyUserDataDir = getLegacyUserDataDir(userDataDir)) {
  const configDir = path.join(userDataDir, 'config');
  const gameCardsDir = path.join(userDataDir, 'game-cards');
  const legacyDirs = [userDataDir];
  if (legacyUserDataDir && legacyUserDataDir !== userDataDir) {
    legacyDirs.push(legacyUserDataDir);
  }
  return {
    modelConfigPath: path.join(configDir, 'model.json'),
    backgroundConfigPath: path.join(configDir, 'background.json'),
    gameCardsDir,
    legacyGameCardsDir: legacyUserDataDir ? path.join(legacyUserDataDir, 'game-cards') : null,
    legacy: {
      modelConfigPaths: legacyDirs.map(dir => path.join(dir, 'model-config.json')),
      backgroundConfigPaths: legacyDirs.map(dir => path.join(dir, 'background-config.json')),
      chatHistoryPaths: legacyDirs.flatMap(dir => [
        path.join(dir, 'game-cards', 'chat', 'history.json'),
        path.join(dir, 'chat', 'history.json'),
        path.join(dir, 'chat-histories', 'chat-history.json')
      ])
    }
  };
}

module.exports = { getLegacyUserDataDir, getUserDataPaths };
