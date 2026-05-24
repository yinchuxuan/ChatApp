const path = require('path');
const { getLegacyUserDataDir, getUserDataPaths } = require('../../ipc/userDataPaths');

describe('userData path layout', () => {
  test('groups business data by domain', () => {
    const paths = getUserDataPaths('/tmp/ChatApp', null);

    expect(paths.modelConfigPath).toBe(path.join('/tmp/ChatApp', 'config', 'model.json'));
    expect(paths.backgroundConfigPath).toBe(path.join('/tmp/ChatApp', 'config', 'background.json'));
    expect(paths.gameCardsDir).toBe(path.join('/tmp/ChatApp', 'game-cards'));
  });

  test('keeps old app directory as migration source', () => {
    const userDataDir = path.join('/Users/test/Library/Application Support', 'ChatApp');
    const paths = getUserDataPaths(userDataDir);

    expect(getLegacyUserDataDir(userDataDir)).toBe(
      path.join('/Users/test/Library/Application Support', 'harness_lab')
    );
    expect(paths.legacy.modelConfigPaths).toContain(
      path.join('/Users/test/Library/Application Support', 'harness_lab', 'model-config.json')
    );
    expect(paths.legacy.chatHistoryPaths).toContain(
      path.join('/Users/test/Library/Application Support', 'ChatApp', 'game-cards', 'chat', 'history.json')
    );
  });
});
