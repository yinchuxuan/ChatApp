/**
 * Mock Electron module for Jest testing
 * This allows main.js to be loaded and tested without actual Electron runtime
 */

// Capture all registered IPC handlers
const registeredHandlers = {};

const mockIpcMain = {
  handle: jest.fn((channel, handler) => {
    registeredHandlers[channel] = handler;
  }),
  on: jest.fn()
};

const mockDialog = {
  showOpenDialog: jest.fn().mockResolvedValue({ canceled: true, filePaths: [] })
};

const mockApp = {
  setName: jest.fn(),
  getPath: jest.fn(() => '/mock-user-data'),
  whenReady: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  quit: jest.fn()
};

const mockBrowserWindow = jest.fn().mockImplementation(() => ({
  loadFile: jest.fn(),
  webPreferences: {}
}));

mockBrowserWindow.getAllWindows = jest.fn(() => []);

// Mock protocol module for custom protocol registration
const mockProtocol = {
  registerFileProtocol: jest.fn((_scheme, _handler) => {
    // Mock implementation - does nothing in test environment
  })
};

// Mock window.electronAPI for renderer process tests
const mockElectronAPI = {
  getModelConfig: jest.fn().mockResolvedValue({ success: true, config: { apiUrl: '', apiKey: '', modelName: '', protocol: 'openai' } }),
  saveModelConfig: jest.fn().mockResolvedValue({ success: true }),
  getBackgroundConfig: jest.fn().mockResolvedValue({ success: true, config: { backgroundImageUrl: '', backgroundOpacity: 0.5 } }),
  saveBackgroundConfig: jest.fn().mockResolvedValue({ success: true }),
  selectBackgroundImage: jest.fn().mockResolvedValue({ success: false, canceled: true }),
  getChatHistory: jest.fn().mockResolvedValue({ success: true, messages: [] }),
  saveChatHistory: jest.fn().mockResolvedValue({ success: true }),
  getGameCards: jest.fn().mockResolvedValue({ success: true, cards: [] }),
  getGameCard: jest.fn().mockResolvedValue({ success: true, card: null }),
  saveGameCard: jest.fn().mockResolvedValue({ success: true }),
  setActiveGameCard: jest.fn().mockResolvedValue({ success: true }),
  getActiveGameCard: jest.fn().mockResolvedValue({ success: true, card: null })
};

module.exports = {
  app: mockApp,
  ipcMain: mockIpcMain,
  dialog: mockDialog,
  BrowserWindow: mockBrowserWindow,
  protocol: mockProtocol
};

// Export handlers for test access
module.exports._registeredHandlers = registeredHandlers;
module.exports._clearHandlers = () => {
  for (const key in registeredHandlers) {
    delete registeredHandlers[key];
  }
};

// Export mock API for tests that need to set it on global.window
module.exports._mockElectronAPI = mockElectronAPI;
