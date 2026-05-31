const fs = require('fs');
const path = require('path');

process.env.INTEGRATION_TEST_DIR = path.join(require('os').tmpdir(), 'chatapp_ipc_sessions_' + Date.now());
jest.mock('electron', () => require('../__mocks__/electronMock.integration.js'));
require('../../main');

const electronMock = require('electron');
const handlers = electronMock._registeredHandlers;
const gameCardsDir = electronMock._gameCardsDir;

function noCardSessionPath(id, fileName) {
  return path.join(gameCardsDir, 'no-card', 'sessions', id, fileName);
}

describe('IPC Chat Sessions', () => {
  afterAll(() => { electronMock._cleanup(); });

  beforeEach(() => {
    if (fs.existsSync(gameCardsDir)) fs.rmSync(gameCardsDir, { recursive: true, force: true });
  });

  test('lists default session when none exists', async () => {
    const result = await handlers['list-chat-sessions']();

    expect(result.success).toBe(true);
    expect(result.activeId).toBe('default');
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]).toMatchObject({ id: 'default', title: '默认会话' });
    expect(fs.existsSync(noCardSessionPath('default', 'messages.json'))).toBe(true);
  });

  test('switches active session and keeps histories separate', async () => {
    await handlers['save-chat-history']({}, [{ role: 'user', content: 'default turn' }]);
    const created = await handlers['create-chat-session']({}, '第二会话');
    await handlers['save-chat-history']({}, [{ role: 'user', content: 'second turn' }]);

    await handlers['set-active-chat-session']({}, 'default');
    const defaultHistory = await handlers['get-chat-history']();
    await handlers['set-active-chat-session']({}, created.id);
    const secondHistory = await handlers['get-chat-history']();

    expect(defaultHistory.messages).toEqual([{ role: 'user', content: 'default turn' }]);
    expect(secondHistory.messages).toEqual([{ role: 'user', content: 'second turn' }]);
  });

  test('save updates session metadata and preserves game state', async () => {
    await handlers['save-chat-history']({}, [{ role: 'user', content: 'hello metadata' }], {
      gameState: { flags: { metSetsuna: true } }
    });

    const history = await handlers['get-chat-history']();
    const list = await handlers['list-chat-sessions']();

    expect(history.gameState).toEqual({ flags: { metSetsuna: true } });
    expect(list.sessions[0]).toMatchObject({
      id: 'default',
      messageCount: 1,
      preview: 'hello metadata'
    });
  });

  test('sessions are isolated by active game card', async () => {
    await handlers['save-chat-history']({}, [{ role: 'user', content: 'no card' }]);
    await handlers['save-game-card']({}, { id: 'quest', name: 'Quest', rules: [] });
    await handlers['set-active-game-card']({}, 'quest');
    await handlers['save-chat-history']({}, [{ role: 'user', content: 'quest card' }]);

    const questHistory = await handlers['get-chat-history']();
    await handlers['set-active-game-card']({}, null);
    const noCardHistory = await handlers['get-chat-history']();

    expect(questHistory.messages).toEqual([{ role: 'user', content: 'quest card' }]);
    expect(noCardHistory.messages).toEqual([{ role: 'user', content: 'no card' }]);
  });

  test('deleting active session falls back to another session', async () => {
    await handlers['save-chat-history']({}, [{ role: 'user', content: 'default turn' }]);
    const created = await handlers['create-chat-session']({}, '临时会话');

    const deleted = await handlers['delete-chat-session']({}, created.id);
    const active = await handlers['get-active-chat-session']();
    const history = await handlers['get-chat-history']();

    expect(deleted.success).toBe(true);
    expect(active.session.id).toBe('default');
    expect(history.messages).toEqual([{ role: 'user', content: 'default turn' }]);
  });
});
