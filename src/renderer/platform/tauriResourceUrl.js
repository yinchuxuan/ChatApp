const RESOURCE_PROTOCOL = 'local';
const USER_BACKGROUND_TOKEN = 'local://user-background/current';
const USER_BACKGROUND_PATH = 'user-background/current';

function requireConverter(convertFileSrc) {
  if (typeof convertFileSrc !== 'function') {
    throw new Error('Tauri API unavailable: convertFileSrc');
  }
  return convertFileSrc;
}

function createTauriResourceUrl(convertFileSrc, virtualPath) {
  return requireConverter(convertFileSrc)(virtualPath, RESOURCE_PROTOCOL);
}

function createGameCardResourceUrl(convertFileSrc, cardId, type, relativePath) {
  return createTauriResourceUrl(convertFileSrc, `game-card/${cardId}/${type}/${relativePath}`);
}

function userBackgroundUrl(convertFileSrc) {
  return createTauriResourceUrl(convertFileSrc, USER_BACKGROUND_PATH);
}

function toRendererBackground(config, convertFileSrc) {
  if (config?.backgroundImageUrl !== USER_BACKGROUND_TOKEN) return config;
  return { ...config, backgroundImageUrl: userBackgroundUrl(convertFileSrc) };
}

function toStoredBackground(config, convertFileSrc) {
  if (config?.backgroundImageUrl !== userBackgroundUrl(convertFileSrc)) return config;
  return { ...config, backgroundImageUrl: USER_BACKGROUND_TOKEN };
}

export {
  USER_BACKGROUND_TOKEN,
  createGameCardResourceUrl,
  toRendererBackground,
  toStoredBackground,
  userBackgroundUrl
};
