import { controlledScriptExecutor } from './controlledScriptExecutor.js';
import { createGameCardPlatform } from './gameCardPlatform.js';
import { tauriBridge } from './tauriBridge.js';
import { invokeTauriCommand } from './tauriCommand.js';
import { createGameCardResourceUrl } from './tauriResourceUrl.js';

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
        return createGameCardResourceUrl(client.convertFileSrc, cardId, 'image', relativePath);
      },
      async getAudioUrl(cardId, relativePath) {
        return createGameCardResourceUrl(client.convertFileSrc, cardId, 'audio', relativePath);
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
