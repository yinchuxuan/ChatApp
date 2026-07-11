function electronApi() {
  return typeof window === 'undefined' ? null : window.electronAPI;
}

function requireApi(method) {
  const api = electronApi();
  if (typeof api?.[method] !== 'function') throw new Error(`Electron API unavailable: ${method}`);
  return api;
}

async function invoke(method, args = [], field) {
  const result = await requireApi(method)[method](...args);
  if (!result?.success) {
    const error = new Error(result?.error || `${method} failed`);
    error.canceled = result?.canceled === true;
    error.stage = result?.stage;
    error.file = result?.file;
    error.details = result?.details;
    throw error;
  }
  if (field) return result[field];
  const payload = { ...result };
  delete payload.success;
  return payload;
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
      subscribe: listener => requireApi('onBackgroundConfigChanged').onBackgroundConfigChanged(listener)
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
