import { controlledScriptExecutor } from './controlledScriptExecutor.js';
import { createGameCardPlatform } from './gameCardPlatform.js';
import { tauriBridge } from './tauriBridge.js';
import { invokeTauriCommand } from './tauriCommand.js';
import { createGameCardResourceUrl } from './tauriResourceUrl.js';
import { getGameCardRuntimeRevision } from '../gameCard/gameCardRuntimeCache.js';

function requireString(value, fallback) {
  if (typeof value !== 'string') throw new Error(fallback);
  return value;
}

/** @returns {import('./contracts.js').GameCardPlatform} */
function createTauriGameCardPlatform(client = tauriBridge) {
  const call = (command, args, field) => invokeTauriCommand(client.invoke, command, args, field);
  let activeCard = null;
  let activeCardRevision = -1;
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
        const revision = getGameCardRuntimeRevision();
        if (revision !== activeCardRevision) {
          activeCardRevision = revision;
          activeCard = call('get_active_game_card', {}, 'card')
            .then(card => card || null)
            .catch(error => {
              if (activeCardRevision === revision) activeCardRevision = -1;
              throw error;
            });
        }
        return activeCard;
      }
    },
    scriptExecutor: controlledScriptExecutor
  });
}

export { createTauriGameCardPlatform };
