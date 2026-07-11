import { controlledScriptExecutor } from './controlledScriptExecutor.js';
import { createGameCardPlatform } from './gameCardPlatform.js';
import { normalizePlatformError, unwrapCommandResult } from './platformCommand.js';

function currentElectronApi() {
  return typeof window === 'undefined' ? null : window.electronAPI;
}

function resolveApi(api) {
  return typeof api === 'function' ? api() : api;
}

function requireApiMethod(apiSource, name) {
  const api = resolveApi(apiSource);
  if (typeof api?.[name] !== 'function') throw new Error(`electron API does not provide ${name}()`);
  return api[name].bind(api);
}

function unwrapResult(result, field, fallback) {
  const value = unwrapCommandResult(result, field, fallback);
  if (typeof value !== 'string') throw new Error(fallback);
  return value;
}

function unwrapActiveCard(result) {
  return unwrapCommandResult(result, 'card', 'failed to load active game card') || null;
}

async function invokeApi(apiSource, name, args, field, fallback) {
  try {
    const invoke = requireApiMethod(apiSource, name);
    const result = await invoke(...args);
    return field === 'card' ? unwrapActiveCard(result) : unwrapResult(result, field, fallback);
  } catch (error) {
    throw normalizePlatformError(error, fallback);
  }
}

/** @returns {import('./contracts.js').GameCardPlatform} */
function createElectronGameCardPlatform(apiSource = currentElectronApi) {
  return createGameCardPlatform({
    resources: {
      async readText(cardId, relativePath) {
        return invokeApi(apiSource, 'readGameCardFile', [cardId, relativePath], 'content', 'failed to read game card file');
      },
      async getImageUrl(cardId, relativePath) {
        return invokeApi(apiSource, 'getGameCardImageUrl', [cardId, relativePath], 'url', 'failed to resolve game card image');
      },
      async getAudioUrl(cardId, relativePath) {
        return invokeApi(apiSource, 'getGameCardAudioUrl', [cardId, relativePath], 'url', 'failed to resolve game card audio');
      }
    },
    repository: {
      async getActiveCard() {
        return invokeApi(apiSource, 'getActiveGameCard', [], 'card', 'failed to load active game card');
      }
    },
    scriptExecutor: controlledScriptExecutor
  });
}

export { createElectronGameCardPlatform, unwrapActiveCard };
