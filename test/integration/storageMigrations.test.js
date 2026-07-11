const fs = require('fs');
const os = require('os');
const path = require('path');
const { createJsonStore } = require('../../ipc/storage/jsonStore');
const { runStorageMigrations } = require('../../ipc/storage/storageMigrations');
const { getUserDataPaths } = require('../../ipc/userDataPaths');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value), 'utf-8');
}

describe('Storage startup migrations', () => {
  let root;
  let currentDir;
  let legacyDir;
  let paths;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-storage-migration-'));
    currentDir = path.join(root, 'ChatApp');
    legacyDir = path.join(root, 'harness_lab');
    paths = getUserDataPaths(currentDir, legacyDir);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('migrates legacy data before handlers start reading it', async () => {
    const model = { apiUrl: 'legacy-url', apiKey: 'legacy-key', modelName: 'legacy-model' };
    const background = { backgroundImageUrl: '', backgroundOpacity: 0.4 };
    const history = [{ role: 'user', content: 'legacy turn' }];
    const card = { id: 'quest', name: 'Quest', rules: [] };
    writeJson(path.join(legacyDir, 'model-config.json'), model);
    writeJson(path.join(legacyDir, 'background-config.json'), background);
    writeJson(path.join(legacyDir, 'game-cards', 'active.json'), { id: 'quest' });
    writeJson(path.join(legacyDir, 'game-cards', 'cards', 'quest', 'card.json'), card);
    writeJson(path.join(legacyDir, 'chat', 'history.json'), history);

    await runStorageMigrations({
      store: createJsonStore(fs),
      fs,
      pathLib: path,
      paths
    });

    const sessionPath = path.join(
      paths.gameCardsDir,
      'cards',
      'quest',
      'sessions',
      'default',
      'messages.json'
    );
    expect(JSON.parse(fs.readFileSync(paths.modelConfigPath, 'utf-8'))).toEqual(model);
    expect(JSON.parse(fs.readFileSync(paths.backgroundConfigPath, 'utf-8'))).toEqual(background);
    expect(JSON.parse(fs.readFileSync(path.join(paths.gameCardsDir, 'cards', 'quest', 'card.json')))).toEqual(card);
    expect(JSON.parse(fs.readFileSync(sessionPath, 'utf-8'))).toEqual(history);
  });

  test('does not overwrite current data on a repeated startup', async () => {
    const current = { apiUrl: 'current', apiKey: '', modelName: '' };
    writeJson(paths.modelConfigPath, current);
    writeJson(path.join(legacyDir, 'model-config.json'), { apiUrl: 'legacy' });

    await runStorageMigrations({
      store: createJsonStore(fs),
      fs,
      pathLib: path,
      paths
    });

    expect(JSON.parse(fs.readFileSync(paths.modelConfigPath, 'utf-8'))).toEqual(current);
  });
});
