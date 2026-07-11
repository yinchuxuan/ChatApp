import { controlledScriptExecutor } from './controlledScriptExecutor.js';
import { createGameCardPlatform } from './gameCardPlatform.js';
import { tauriBridge } from './tauriBridge.js';
import { invokeTauriCommand } from './tauriCommand.js';

function requireString(value, fallback) {
  if (typeof value !== 'string') throw new Error(fallback);
  return value;
}

/** @returns {import('./contracts.js').GameCardPlatform} */
function createTauriGameCardPlatform(client = tauriBridge) {
  const call = (command, args, field) => invokeTauriCommand(client.invoke, command, args, field);
  return createGameCardPlatform({
    resources: {
      async readText(cardId, relativePath) {
        const value = await call('read_game_card_file', { cardId, relativePath }, 'content');
        return requireString(value, 'failed to read game card file');
      },
      async getImageUrl(cardId, relativePath) {
        const value = await call('get_game_card_image_url', { cardId, relativePath }, 'url');
        return requireString(value, 'failed to resolve game card image');
      },
      async getAudioUrl(cardId, relativePath) {
        const value = await call('get_game_card_audio_url', { cardId, relativePath }, 'url');
        return requireString(value, 'failed to resolve game card audio');
      }
    },
    repository: {
      async getActiveCard() {
        return await call('get_active_game_card', {}, 'card') || null;
      }
    },
    scriptExecutor: controlledScriptExecutor
  });
}

export { createTauriGameCardPlatform };
