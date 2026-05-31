/**
 * Electron App Helper for Playwright E2E Tests
 * Combines core, IPC, and style helper modules
 */

const { ElectronAppHelperCore } = require('./electronAppHelperCore');
const { ElectronAppHelperIPC } = require('./electronAppHelperIPC');
const { ElectronAppHelperStyle } = require('./electronAppHelperStyle');

class ElectronAppHelper extends ElectronAppHelperCore {
  constructor() {
    super();
  }

  async launch() {
    const result = await super.launch();
    this._ipcHelper = new ElectronAppHelperIPC(this.window);
    this._styleHelper = new ElectronAppHelperStyle(this.window);
    return result;
  }

  async relaunch() {
    const result = await super.relaunch();
    // Reinitialize IPC and style helpers with the new window
    this._ipcHelper = new ElectronAppHelperIPC(this.window);
    this._styleHelper = new ElectronAppHelperStyle(this.window);
    return result;
  }

  // IPC methods
  saveModelConfig(config) { return this._ipcHelper.saveModelConfig(config); }
  getModelConfig() { return this._ipcHelper.getModelConfig(); }
  saveBackgroundConfig(config) { return this._ipcHelper.saveBackgroundConfig(config); }
  getBackgroundConfig() { return this._ipcHelper.getBackgroundConfig(); }
  readBackgroundImage(filePath) { return this._ipcHelper.readBackgroundImage(filePath); }
  saveChatHistory(messages) { return this._ipcHelper.saveChatHistory(messages); }
  getChatHistory() { return this._ipcHelper.getChatHistory(); }
  listChatSessions() { return this._ipcHelper.listChatSessions(); }
  getActiveChatSession() { return this._ipcHelper.getActiveChatSession(); }
  createChatSession(title) { return this._ipcHelper.createChatSession(title); }
  setActiveChatSession(id) { return this._ipcHelper.setActiveChatSession(id); }
  renameChatSession(id, title) { return this._ipcHelper.renameChatSession(id, title); }
  deleteChatSession(id) { return this._ipcHelper.deleteChatSession(id); }
  getGameCards() { return this._ipcHelper.getGameCards(); }
  getGameCard(id) { return this._ipcHelper.getGameCard(id); }
  saveGameCard(card) { return this._ipcHelper.saveGameCard(card); }
  setActiveGameCard(id) { return this._ipcHelper.setActiveGameCard(id); }
  getActiveGameCard() { return this._ipcHelper.getActiveGameCard(); }
  readGameCardFile(id, relativePath) { return this._ipcHelper.readGameCardFile(id, relativePath); }

  // Style methods
  getElementBoundingBox(selector) { return this._styleHelper.getElementBoundingBox(selector); }
  hasHorizontalOverflow(selector) { return this._styleHelper.hasHorizontalOverflow(selector); }
  getComputedStyle(selector) { return this._styleHelper.getComputedStyle(selector); }
}

module.exports = { ElectronAppHelper };
