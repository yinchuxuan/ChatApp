import { controlledScriptExecutor } from './controlledScriptExecutor.js';
import { createGameCardPlatform } from './gameCardPlatform.js';

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
  if (!result || result.success === false) throw new Error(result?.error || fallback);
  const value = result[field];
  if (typeof value !== 'string') throw new Error(fallback);
  return value;
}

function extractActiveCard(result) {
  if (!result || result.success === false) return null;
  if (result.rules) return result;
  return result.card || result.gameCard || result.activeGameCard || null;
}

function unwrapActiveCard(result) {
  if (result?.success === false) throw new Error(result.error || 'failed to load active game card');
  return extractActiveCard(result);
}

function createElectronGameCardPlatform(apiSource = currentElectronApi) {
  return createGameCardPlatform({
    resources: {
      async readText(cardId, relativePath) {
        const invoke = requireApiMethod(apiSource, 'readGameCardFile');
        return unwrapResult(await invoke(cardId, relativePath), 'content', 'failed to read game card file');
      },
      async getImageUrl(_cardId, relativePath) {
        const invoke = requireApiMethod(apiSource, 'getGameCardImageUrl');
        return unwrapResult(await invoke(relativePath), 'url', 'failed to resolve game card image');
      },
      async getAudioUrl(_cardId, relativePath) {
        const invoke = requireApiMethod(apiSource, 'getGameCardAudioUrl');
        return unwrapResult(await invoke(relativePath), 'url', 'failed to resolve game card audio');
      }
    },
    repository: {
      async getActiveCard() {
        const invoke = requireApiMethod(apiSource, 'getActiveGameCard');
        return unwrapActiveCard(await invoke());
      }
    },
    scriptExecutor: controlledScriptExecutor
  });
}

export { createElectronGameCardPlatform, extractActiveCard, unwrapActiveCard };
