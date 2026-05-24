/**
 * Electron App Helper - IPC Functions
 */

class ElectronAppHelperIPC {
  constructor(window) {
    this.window = window;
  }

  async saveModelConfig(config) {
    return await this.window.evaluate(async ({ config }) => {
      if (window.electronAPI) return await window.electronAPI.saveModelConfig(config);
      return { success: false, error: 'electronAPI not available' };
    }, { config });
  }

  async getModelConfig() {
    return await this.window.evaluate(async () => {
      if (window.electronAPI) return await window.electronAPI.getModelConfig();
      return { success: false, error: 'electronAPI not available' };
    });
  }

  async saveBackgroundConfig(config) {
    return await this.window.evaluate(async ({ config }) => {
      if (window.electronAPI) return await window.electronAPI.saveBackgroundConfig(config);
      return { success: false, error: 'electronAPI not available' };
    }, { config });
  }

  async getBackgroundConfig() {
    return await this.window.evaluate(async () => {
      if (window.electronAPI) return await window.electronAPI.getBackgroundConfig();
      return { success: false, error: 'electronAPI not available' };
    });
  }

  async readBackgroundImage(filePath) {
    return await this.window.evaluate(async ({ filePath }) => {
      if (window.electronAPI) return await window.electronAPI.readBackgroundImage(filePath);
      return { success: false, error: 'electronAPI not available' };
    }, { filePath });
  }

  async saveChatHistory(messages) {
    return await this.window.evaluate(async ({ messages }) => {
      if (window.electronAPI) return await window.electronAPI.saveChatHistory(messages);
      return { success: false, error: 'electronAPI not available' };
    }, { messages });
  }

  async getChatHistory() {
    return await this.window.evaluate(async () => {
      if (window.electronAPI) return await window.electronAPI.getChatHistory();
      return { success: false, error: 'electronAPI not available' };
    });
  }

  async getGameCards() {
    return await this.window.evaluate(async () => {
      if (window.electronAPI) return await window.electronAPI.getGameCards();
      return { success: false, error: 'electronAPI not available' };
    });
  }

  async getGameCard(id) {
    return await this.window.evaluate(async ({ id }) => {
      if (window.electronAPI) return await window.electronAPI.getGameCard(id);
      return { success: false, error: 'electronAPI not available' };
    }, { id });
  }

  async saveGameCard(card) {
    return await this.window.evaluate(async ({ card }) => {
      if (window.electronAPI) return await window.electronAPI.saveGameCard(card);
      return { success: false, error: 'electronAPI not available' };
    }, { card });
  }

  async setActiveGameCard(id) {
    return await this.window.evaluate(async ({ id }) => {
      if (window.electronAPI) return await window.electronAPI.setActiveGameCard(id);
      return { success: false, error: 'electronAPI not available' };
    }, { id });
  }

  async getActiveGameCard() {
    return await this.window.evaluate(async () => {
      if (window.electronAPI) return await window.electronAPI.getActiveGameCard();
      return { success: false, error: 'electronAPI not available' };
    });
  }

  async readGameCardFile(id, relativePath) {
    return await this.window.evaluate(async ({ id, relativePath }) => {
      if (window.electronAPI) return await window.electronAPI.readGameCardFile(id, relativePath);
      return { success: false, error: 'electronAPI not available' };
    }, { id, relativePath });
  }
}

module.exports = { ElectronAppHelperIPC };
