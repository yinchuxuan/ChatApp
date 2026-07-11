function requireMethod(owner, name) {
  if (typeof owner?.[name] !== 'function') {
    throw new Error(`game card platform requires ${name}()`);
  }
}

/**
 * @param {import('./contracts.js').GameCardPlatformOptions} options
 * @returns {import('./contracts.js').GameCardPlatform}
 */
function createGameCardPlatform({ resources, repository, scriptExecutor } = {}) {
  requireMethod(resources, 'readText');
  requireMethod(resources, 'getImageUrl');
  requireMethod(resources, 'getAudioUrl');
  requireMethod(repository, 'getActiveCard');
  requireMethod(scriptExecutor, 'run');
  return Object.freeze({
    resources: Object.freeze(resources),
    repository: Object.freeze(repository),
    scriptExecutor: Object.freeze(scriptExecutor)
  });
}

export { createGameCardPlatform };
