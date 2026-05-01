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
}

module.exports = { ElectronAppHelperIPC };
