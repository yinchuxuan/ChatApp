/**
 * IPC Integration Tests - Chat History Operations
 */

const fs = require('fs');
const path = require('path');

process.env.INTEGRATION_TEST_DIR = path.join(require('os').tmpdir(), 'chatapp_ipc_chat_' + Date.now());
jest.mock('electron', () => require('../__mocks__/electronMock.integration.js'));
require('../../main');

const electronMock = require('electron');
const handlers = electronMock._registeredHandlers;
const gameCardsDir = electronMock._gameCardsDir;
const chatHistoryPath = electronMock._chatHistoryPath;
const chatHistoryDir = electronMock._chatHistoryDir;

describe('IPC Chat History Operations', () => {
  afterAll(() => { electronMock._cleanup(); });

  beforeEach(() => {
    if (fs.existsSync(gameCardsDir)) fs.rmSync(gameCardsDir, { recursive: true, force: true });
  });

  test('should return empty messages when no history file', async () => {
    const result = await handlers['get-chat-history']();
    expect(result.success).toBe(true);
    expect(result.messages).toEqual([]);
  });

  test('should save and retrieve chat history', async () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!', thinking: 'Let me think...' }
    ];

    const saveResult = await handlers['save-chat-history']({}, messages);
    expect(saveResult.success).toBe(true);
    expect(fs.existsSync(chatHistoryPath)).toBe(true);

    const getResult = await handlers['get-chat-history']();
    expect(getResult.success).toBe(true);
    expect(getResult.messages).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!', thinking: 'Let me think...', _thinking: 'Let me think...' }
    ]);
  });

  test('should save and retrieve game card runtime fields', async () => {
    const messages = [{
      role: 'system',
      content: 'rules',
      _meta: { source: 'game_card', visibility: 'llm_only' },
      ttl: 2
    }];

    await handlers['save-chat-history']({}, messages);

    const raw = JSON.parse(fs.readFileSync(chatHistoryPath, 'utf-8'));
    const result = await handlers['get-chat-history']();
    expect(raw).toEqual({ messages, gameState: {} });
    expect(result.messages).toEqual(messages);
  });

  test('should save and retrieve retry base messages', async () => {
    const messages = [
      { role: 'system', content: 'rules', _meta: { visibility: 'llm_only' } },
      { role: 'user', content: 'Question' }
    ];
    const retryBaseMessages = [{ role: 'user', content: 'Question' }];
    const retryBasePath = path.join(path.dirname(chatHistoryPath), 'retry-base.json');

    await handlers['save-chat-history']({}, messages, { retryBaseMessages });

    const rawRetryBase = JSON.parse(fs.readFileSync(retryBasePath, 'utf-8'));
    const result = await handlers['get-chat-history']();
    expect(rawRetryBase).toEqual(retryBaseMessages);
    expect(result.retryBaseMessages).toEqual(retryBaseMessages);
  });

  test('should overwrite existing chat history', async () => {
    const firstMessages = [{ role: 'user', content: 'First' }];
    await handlers['save-chat-history']({}, firstMessages);

    const secondMessages = [
      { role: 'user', content: 'Second' },
      { role: 'assistant', content: 'Response' }
    ];
    await handlers['save-chat-history']({}, secondMessages);

    const result = await handlers['get-chat-history']();
    expect(result.messages).toEqual(secondMessages);
  });

  test('should handle saving empty messages (clear history)', async () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' }
    ];
    await handlers['save-chat-history']({}, messages);

    // Clear by saving empty array
    await handlers['save-chat-history']({}, []);

    const result = await handlers['get-chat-history']();
    expect(result.messages).toEqual([]);
  });

  test('chat history should be in independent directory', async () => {
    const messages = [{ role: 'user', content: 'Test' }];
    await handlers['save-chat-history']({}, messages);

    expect(fs.existsSync(chatHistoryDir)).toBe(true);
    expect(fs.statSync(chatHistoryDir).isDirectory()).toBe(true);
    expect(fs.existsSync(chatHistoryPath)).toBe(true);
  });

  test('chat history follows active game card session', async () => {
    const card = { id: 'quest', name: 'Quest', rules: [] };
    const expectedPath = path.join(gameCardsDir, 'cards', 'quest', 'sessions', 'default', 'messages.json');

    await handlers['save-game-card']({}, card);
    await handlers['set-active-game-card']({}, 'quest');
    await handlers['save-chat-history']({}, [{ role: 'user', content: 'Quest session' }]);

    expect(fs.existsSync(expectedPath)).toBe(true);
    expect(JSON.parse(fs.readFileSync(expectedPath, 'utf-8'))).toEqual({
      messages: [{ role: 'user', content: 'Quest session' }],
      gameState: {}
    });
  });
});
