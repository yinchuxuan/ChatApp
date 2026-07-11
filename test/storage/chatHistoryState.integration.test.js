const fs = require('fs');
const path = require('path');

process.env.INTEGRATION_TEST_DIR = path.join(require('os').tmpdir(), 'chatapp_ipc_state_' + Date.now());
jest.mock('electron', () => require('../__mocks__/electronMock.integration.js'));
require('../../main');

const electronMock = require('electron');
const handlers = electronMock._registeredHandlers;
const gameCardsDir = electronMock._gameCardsDir;
const chatHistoryPath = electronMock._chatHistoryPath;

function writeHistory(value) {
  fs.mkdirSync(path.dirname(chatHistoryPath), { recursive: true });
  fs.writeFileSync(chatHistoryPath, JSON.stringify(value, null, 2), 'utf-8');
}

describe('IPC chat history state persistence', () => {
  afterAll(() => { electronMock._cleanup(); });

  beforeEach(() => {
    if (fs.existsSync(gameCardsDir)) fs.rmSync(gameCardsDir, { recursive: true, force: true });
  });

  test('reads legacy array history with empty gameState', async () => {
    const messages = [{ role: 'user', content: 'legacy' }];
    writeHistory(messages);

    const result = await handlers['get-chat-history']();

    expect(result.success).toBe(true);
    expect(result.messages).toEqual(messages);
    expect(result.gameState).toEqual({});
  });

  test('reads object history with messages and gameState', async () => {
    const history = {
      messages: [{ role: 'assistant', content: 'saved' }],
      gameState: { player: { hp: 80 }, route: 'alice' }
    };
    writeHistory(history);

    const result = await handlers['get-chat-history']();

    expect(result.success).toBe(true);
    expect(result.messages).toEqual(history.messages);
    expect(result.gameState).toEqual(history.gameState);
  });

  test('saves object history with messages and gameState', async () => {
    const history = {
      messages: [{ role: 'user', content: 'turn' }],
      gameState: { player: { hp: 70 } }
    };

    const result = await handlers['save-chat-history']({}, history);
    const raw = JSON.parse(fs.readFileSync(chatHistoryPath, 'utf-8'));

    expect(result.success).toBe(true);
    expect(raw).toEqual(history);
  });

  test('saves gameState from options for legacy message-array calls', async () => {
    const messages = [{ role: 'user', content: 'turn' }];
    const gameState = { flags: { metAlice: true } };

    await handlers['save-chat-history']({}, messages, { gameState });

    expect(JSON.parse(fs.readFileSync(chatHistoryPath, 'utf-8'))).toEqual({
      messages,
      gameState
    });
  });

  test('preserves message runtime fields in object history', async () => {
    const message = {
      role: 'system',
      content: 'rules',
      _thinking: 'ui only',
      _meta: { source: 'game_card', visibility: 'llm_only' },
      ttl: 2
    };

    await handlers['save-chat-history']({}, { messages: [message], gameState: { turn: 1 } });
    const raw = JSON.parse(fs.readFileSync(chatHistoryPath, 'utf-8'));

    expect(raw).toEqual({
      messages: [{
        role: 'system',
        content: 'rules',
        _meta: { source: 'game_card', visibility: 'llm_only' },
        ttl: 2
      }],
      gameState: { turn: 1 }
    });
  });
});
