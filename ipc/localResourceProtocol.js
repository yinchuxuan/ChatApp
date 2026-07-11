const path = require('path');
const { getCardAudioPath, getCardImagePath, IMAGE_EXTENSIONS } = require('./gameCardAssets');
const { readJsonFile } = require('./gameCardStorage');

const FILE_NOT_FOUND = -6;
const USER_BACKGROUND_URL = 'local://user-background/current';

function encodePath(relativePath) {
  return relativePath
    .split(/[\\/]/)
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

function createGameCardResourceUrl(cardId, type, relativePath) {
  return `local://game-card/${encodeURIComponent(cardId)}/${type}/${encodePath(relativePath)}`;
}

function decodeSegments(pathname) {
  const segments = pathname.split('/').slice(1);
  if (segments.length === 0 || segments.some(segment => !segment)) {
    throw new Error('Invalid local resource URL');
  }
  return segments.map(segment => decodeURIComponent(segment));
}

function resolveGameCardResource(parsed, dependencies) {
  const { fs, cardsDir, activePath } = dependencies;
  const [cardId, type, ...resourceSegments] = decodeSegments(parsed.pathname);
  const active = readJsonFile(fs, activePath, { id: null });
  if (!active?.id || active.id !== cardId || resourceSegments.length === 0) {
    throw new Error('Game card resource is not authorized');
  }
  const relativePath = resourceSegments.join('/');
  if (type === 'audio') return getCardAudioPath(fs, cardsDir, cardId, relativePath);
  if (type === 'image') return getCardImagePath(fs, cardsDir, cardId, relativePath);
  throw new Error('Unsupported game card resource type');
}

function resolveBackgroundResource(parsed, dependencies) {
  const { fs, backgroundConfigPath } = dependencies;
  if (parsed.pathname !== '/current') throw new Error('Invalid user background URL');
  const config = readJsonFile(fs, backgroundConfigPath, null);
  const filePath = config?.backgroundImagePath;
  if (config?.backgroundImageUrl !== USER_BACKGROUND_URL || typeof filePath !== 'string') {
    throw new Error('User background is not authorized');
  }
  const extension = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(extension)) throw new Error('Invalid user background extension');
  if (!fs.existsSync(filePath)) throw new Error('User background file not found');
  const realPath = fs.realpathSync(filePath);
  if (!fs.statSync(realPath).isFile()) throw new Error('User background must be a file');
  return realPath;
}

function resolveLocalResourcePath(requestUrl, dependencies) {
  const parsed = new URL(requestUrl);
  if (parsed.protocol !== 'local:' || parsed.username || parsed.password || parsed.port
    || parsed.search || parsed.hash) {
    throw new Error('Invalid local resource URL');
  }
  if (parsed.hostname === 'game-card') return resolveGameCardResource(parsed, dependencies);
  if (parsed.hostname === 'user-background') return resolveBackgroundResource(parsed, dependencies);
  throw new Error('Local resource is not authorized');
}

function registerLocalResourceProtocol(protocol, dependencies) {
  protocol.registerFileProtocol('local', (request, callback) => {
    try {
      callback({ path: resolveLocalResourcePath(request.url, dependencies) });
    } catch {
      callback({ error: FILE_NOT_FOUND });
    }
  });
}

module.exports = {
  USER_BACKGROUND_URL,
  createGameCardResourceUrl,
  registerLocalResourceProtocol,
  resolveLocalResourcePath
};
