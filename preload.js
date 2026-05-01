const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getModelConfig: () => ipcRenderer.invoke('get-model-config'),
  saveModelConfig: (config) => ipcRenderer.invoke('save-model-config', config),
  getBackgroundConfig: () => ipcRenderer.invoke('get-background-config'),
  saveBackgroundConfig: (config) => ipcRenderer.invoke('save-background-config', config),
  selectBackgroundImage: () => ipcRenderer.invoke('select-background-image'),
  readBackgroundImage: (filePath) => ipcRenderer.invoke('read-background-image', filePath),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  saveChatHistory: (messages) => ipcRenderer.invoke('save-chat-history', messages),
  onBackgroundConfigChanged: (callback) => ipcRenderer.on('background-config-changed', (event, config) => callback(config))
});