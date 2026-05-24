/**
 * E2E Tests - Chat History Persistence
 * Tests that chat history IPC works and file operations function correctly
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('../electronAppHelper');

let appHelper;

test.beforeAll(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
}, { timeout: 30000 });

test.afterAll(async () => {
  await appHelper.close();
});

test.describe('Chat History Persistence', () => {
  test('should save chat history via IPC', async () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];

    const saveResult = await appHelper.saveChatHistory(messages);
    expect(saveResult.success).toBe(true);

    const getResult = await appHelper.getChatHistory();
    expect(getResult.success).toBe(true);
    expect(getResult.messages.length).toBe(2);
    expect(getResult.messages[0].content).toBe('Hello');
  });

  test('should return empty messages for new history', async () => {
    // Clear history first
    await appHelper.saveChatHistory([]);

    const result = await appHelper.getChatHistory();
    expect(result.success).toBe(true);
    expect(result.messages).toEqual([]);
  });

  test('should clear chat history via IPC when cleared in UI', async () => {
    // Save some messages
    const messages = [{ role: 'user', content: 'Test' }];
    await appHelper.saveChatHistory(messages);

    // Verify saved
    let result = await appHelper.getChatHistory();
    expect(result.messages.length).toBe(1);

    // Clear via IPC
    await appHelper.saveChatHistory([]);
    result = await appHelper.getChatHistory();
    expect(result.messages).toEqual([]);
  });

  test('should persist chat history across app restart', async () => {
    const messages = [
      { role: 'user', content: 'Persist test' },
      { role: 'assistant', content: 'Response' }
    ];
    await appHelper.saveChatHistory(messages);

    // Relaunch the app
    await appHelper.relaunch();
    await appHelper.waitForSelector('.app-container', { timeout: 15000 });

    // Verify messages are still retrievable after restart
    const result = await appHelper.getChatHistory();
    expect(result.success).toBe(true);
    expect(result.messages.length).toBe(2);
    expect(result.messages[0].content).toBe('Persist test');
  }, { timeout: 60000 });
});
