const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Import IPC handlers
const { registerConfigHandlers } = require('./ipc/configHandlers');
const { registerBackgroundHandlers } = require('./ipc/backgroundHandlers');
const { registerChatHistoryHandlers } = require('./ipc/chatHistoryHandlers');
const { registerGameCardHandlers } = require('./ipc/gameCardHandlers');
const { registerLocalResourceProtocol } = require('./ipc/localResourceProtocol');
const { getUserDataPaths } = require('./ipc/userDataPaths');

// Data directory path
let configPath;
let legacyConfigPath;
let backgroundConfigPath;
let legacyBackgroundConfigPath;
let legacyChatHistoryPath;
let gameCardsDir;
let legacyGameCardsDir;

app.setName('ChatApp');

// Set custom userData directory for E2E tests if specified
const customUserDataDir = process.env.E2E_USER_DATA_DIR;
if (customUserDataDir) {
  app.setPath('userData', customUserDataDir);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('src/index.html');
}

// Register all IPC handlers
function registerAllHandlers() {
  registerConfigHandlers(ipcMain, configPath, fs, legacyConfigPath);
  registerBackgroundHandlers(ipcMain, backgroundConfigPath, fs, path, dialog, legacyBackgroundConfigPath);
  registerGameCardHandlers(ipcMain, gameCardsDir, fs, dialog, legacyGameCardsDir);
  registerChatHistoryHandlers(ipcMain, gameCardsDir, fs, legacyChatHistoryPath);
}

app.whenReady().then(() => {
  const userDataDir = app.getPath('userData');
  const paths = getUserDataPaths(userDataDir, customUserDataDir ? null : undefined);
  configPath = paths.modelConfigPath;
  legacyConfigPath = paths.legacy.modelConfigPaths;
  backgroundConfigPath = paths.backgroundConfigPath;
  legacyBackgroundConfigPath = paths.legacy.backgroundConfigPaths;
  legacyChatHistoryPath = paths.legacy.chatHistoryPaths;
  gameCardsDir = paths.gameCardsDir;
  legacyGameCardsDir = paths.legacyGameCardsDir;

  registerLocalResourceProtocol(protocol, {
    fs,
    cardsDir: path.join(gameCardsDir, 'cards'),
    activePath: path.join(gameCardsDir, 'active.json'),
    backgroundConfigPath
  });

  // Register all IPC handlers
  registerAllHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
