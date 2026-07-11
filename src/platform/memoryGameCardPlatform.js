import { controlledScriptExecutor } from './controlledScriptExecutor.js';
import { createGameCardPlatform } from './gameCardPlatform.js';

function findResource(values, cardId, relativePath) {
  const cardValues = values?.[cardId];
  if (cardValues && Object.prototype.hasOwnProperty.call(cardValues, relativePath)) {
    return cardValues[relativePath];
  }
  return values?.[relativePath];
}

function requireResource(values, cardId, relativePath, kind) {
  const value = findResource(values, cardId, relativePath);
  if (typeof value !== 'string') throw new Error(`missing ${kind}: ${relativePath}`);
  return value;
}

function createMemoryGameCardPlatform({
  activeCard = null,
  files = {},
  imageUrls = {},
  audioUrls = {},
  scriptExecutor = controlledScriptExecutor
} = {}) {
  return createGameCardPlatform({
    resources: {
      async readText(cardId, relativePath) {
        return requireResource(files, cardId, relativePath, 'text resource');
      },
      async getImageUrl(cardId, relativePath) {
        return requireResource(imageUrls, cardId, relativePath, 'image resource');
      },
      async getAudioUrl(cardId, relativePath) {
        return requireResource(audioUrls, cardId, relativePath, 'audio resource');
      }
    },
    repository: { async getActiveCard() { return activeCard; } },
    scriptExecutor
  });
}

export { createMemoryGameCardPlatform };
