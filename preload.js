const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getModelConfig: () => ipcRenderer.invoke('get-model-config'),
  saveModelConfig: (config) => ipcRenderer.invoke('save-model-config', config),
  getBackgroundConfig: () => ipcRenderer.invoke('get-background-config'),
  saveBackgroundConfig: (config) => ipcRenderer.invoke('save-background-config', config),
  selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),
  readBackgroundImage: (filePath) => ipcRenderer.invoke('read-background-image', filePath),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  saveChatHistory: (messages, options) => ipcRenderer.invoke('save-chat-history', messages, options),
  listChatSessions: () => ipcRenderer.invoke('list-chat-sessions'),
  getActiveChatSession: () => ipcRenderer.invoke('get-active-chat-session'),
  createChatSession: (title) => ipcRenderer.invoke('create-chat-session', title),
  setActiveChatSession: (id) => ipcRenderer.invoke('set-active-chat-session', id),
  renameChatSession: (id, title) => ipcRenderer.invoke('rename-chat-session', id, title),
  deleteChatSession: (id) => ipcRenderer.invoke('delete-chat-session', id),
  getGameCards: () => ipcRenderer.invoke('get-game-cards'),
  getGameCard: (id) => ipcRenderer.invoke('get-game-card', id),
  saveGameCard: (card) => ipcRenderer.invoke('save-game-card', card),
  importGameCardFromDirectory: () => ipcRenderer.invoke('import-game-card-from-directory'),
  setActiveGameCard: (id) => ipcRenderer.invoke('set-active-game-card', id),
  getActiveGameCard: () => ipcRenderer.invoke('get-active-game-card'),
  readGameCardFile: (id, relativePath) => ipcRenderer.invoke('read-game-card-file', id, relativePath),
  getGameCardAudioUrl: (relativePath) => ipcRenderer.invoke('get-game-card-audio-url', relativePath),
  onBackgroundConfigChanged: (callback) => ipcRenderer.on('background-config-changed', (event, config) => callback(config))
});
