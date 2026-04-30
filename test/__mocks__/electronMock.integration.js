/**
 * Mock Electron module for Integration Tests
 * Uses real file system paths for testing actual file operations
 */

const path = require('path');
const os = require('os');

// Get the test directory from environment or create one
const testDir = process.env.INTEGRATION_TEST_DIR || path.join(os.tmpdir(), 'harness_lab_ipc_test_' + Date.now());
const dataDir = path.join(testDir, 'knowledge-base-data');
const configPath = path.join(testDir, 'model-config.json');
const backgroundConfigPath = path.join(testDir, 'background-config.json');

// Ensure directories exist
const fs = require('fs');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Capture all registered IPC handlers
const registeredHandlers = {};

const mockIpcMain = {
  handle: (channel, handler) => {
    registeredHandlers[channel] = handler;
  },
  on: jest.fn()
};

const mockDialog = {
  showOpenDialog: jest.fn().mockResolvedValue({ canceled: true, filePaths: [] })
};

const mockApp = {
  getPath: (name) => {
    if (name === 'userData') return testDir;
    return testDir;
  },
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

module.exports = {
  app: mockApp,
  ipcMain: mockIpcMain,
  dialog: mockDialog,
  BrowserWindow: mockBrowserWindow,
  protocol: mockProtocol
};

// Export handlers for test access
module.exports._registeredHandlers = registeredHandlers;
module.exports._testDir = testDir;
module.exports._dataDir = dataDir;
module.exports._configPath = configPath;
module.exports._backgroundConfigPath = backgroundConfigPath;

module.exports._clearHandlers = () => {
  for (const key in registeredHandlers) {
    delete registeredHandlers[key];
  }
};

module.exports._cleanup = () => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
};