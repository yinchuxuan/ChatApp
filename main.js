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
const { createJsonStore } = require('./ipc/storage/jsonStore');
const { createKeyedQueue } = require('./ipc/storage/keyedQueue');
const { runStorageMigrations } = require('./ipc/storage/storageMigrations');

// Data directory path
let userDataPaths;
let storage;
const chatSessionQueue = createKeyedQueue();

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

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, 'dist/renderer/index.html'));
  }
}

// Register all IPC handlers
function registerAllHandlers() {
  const options = { store: storage };
  registerConfigHandlers(ipcMain, userDataPaths.modelConfigPath, fs, options);
  registerBackgroundHandlers(ipcMain, userDataPaths.backgroundConfigPath, fs, path, dialog, options);
  registerGameCardHandlers(ipcMain, userDataPaths.gameCardsDir, fs, dialog, options);
  registerChatHistoryHandlers(ipcMain, userDataPaths.gameCardsDir, fs, {
    ...options,
    queue: chatSessionQueue
  });
}

app.whenReady().then(async () => {
  const userDataDir = app.getPath('userData');
  userDataPaths = getUserDataPaths(userDataDir, customUserDataDir ? null : undefined);
  storage = createJsonStore(fs);

  registerLocalResourceProtocol(protocol, {
    fs,
    cardsDir: path.join(userDataPaths.gameCardsDir, 'cards'),
    activePath: path.join(userDataPaths.gameCardsDir, 'active.json'),
    backgroundConfigPath: userDataPaths.backgroundConfigPath
  });

  // Register all IPC handlers
  registerAllHandlers();
  await runStorageMigrations({ store: storage, fs, pathLib: path, paths: userDataPaths });

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
