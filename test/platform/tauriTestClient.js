import { createTauriGameCardPlatform } from '../../src/renderer/platform/tauriGameCardPlatform.js';

function resolveApi(apiSource) {
  return typeof apiSource === 'function' ? apiSource() : apiSource;
}

function call(apiSource, method, args) {
  const fn = resolveApi(apiSource)?.[method];
  if (typeof fn !== 'function') throw new Error(`Missing Tauri test command: ${method}`);
  return fn(...args);
}

function unwrapUrl(result) {
  return Promise.resolve(result).then(value => {
    if (value?.success === false) throw new Error(value.error || 'resource lookup failed');
    return value?.url ?? value;
  });
}

function createTauriTestClient(apiSource = () => global.platformMock) {
  return {
    invoke(command, args = {}) {
      if (command === 'read_game_card_file') {
        return call(apiSource, 'readGameCardFile', [args.cardId, args.relativePath]);
      }
      if (command === 'get_active_game_card') {
        return call(apiSource, 'getActiveGameCard', []);
      }
      throw new Error(`Unexpected Tauri test command: ${command}`);
    },
    convertFileSrc(value) {
      const match = /^game-card\/([^/]*)\/(image|audio)\/(.+)$/.exec(value);
      if (!match) return `local://localhost/${value}`;
      const method = match[2] === 'image' ? 'getGameCardImageUrl' : 'getGameCardAudioUrl';
      return unwrapUrl(call(apiSource, method, [match[1], match[3]]));
    }
  };
}

function createTestGameCardPlatform(apiSource) {
  return createTauriGameCardPlatform(createTauriTestClient(apiSource));
}

export { createTauriTestClient, createTestGameCardPlatform };
