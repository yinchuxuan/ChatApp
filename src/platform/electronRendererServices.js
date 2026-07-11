import { normalizePlatformError, unwrapCommandResult } from './platformCommand.js';

function electronApi() {
  return typeof window === 'undefined' ? null : window.electronAPI;
}

function requireApi(method) {
  const api = electronApi();
  if (typeof api?.[method] !== 'function') throw new Error(`Electron API unavailable: ${method}`);
  return api;
}

function subscribeToBackground(listener) {
  const api = electronApi();
  if (typeof api?.onBackgroundConfigChanged !== 'function') return () => {};
  return api.onBackgroundConfigChanged(listener);
}

async function invoke(method, args = [], field) {
  try {
    const result = await requireApi(method)[method](...args);
    return unwrapCommandResult(result, field, `${method} failed`);
  } catch (error) {
    throw normalizePlatformError(error, `${method} failed`);
  }
}

/** @returns {import('./contracts.js').RendererServices} */
function createElectronRendererServices() {
  return Object.freeze({
    config: Object.freeze({
      load: () => invoke('getModelConfig', [], 'config'),
      save: config => invoke('saveModelConfig', [config], 'config')
    }),
    background: Object.freeze({
      load: () => invoke('getBackgroundConfig', [], 'config'),
      save: config => invoke('saveBackgroundConfig', [config], 'config'),
      selectImage: () => invoke('selectBackgroundImage', [], 'localUrl'),
      subscribe: subscribeToBackground
    }),
    sessions: Object.freeze({
      loadHistory: () => invoke('getChatHistory'),
      saveHistory: (messages, options) => invoke('saveChatHistory', [messages, options]),
      list: () => invoke('listChatSessions'),
      getActive: () => invoke('getActiveChatSession', [], 'session'),
      create: title => invoke('createChatSession', [title]),
      setActive: id => invoke('setActiveChatSession', [id]),
      rename: (id, title) => invoke('renameChatSession', [id, title]),
      delete: id => invoke('deleteChatSession', [id])
    }),
    cards: Object.freeze({
      importDirectory: () => invoke('importGameCardFromDirectory')
    })
  });
}

export { createElectronRendererServices };
