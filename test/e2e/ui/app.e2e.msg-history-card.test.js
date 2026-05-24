/**
 * E2E Tests - Msg History Display Card
 * Tests the rectangular card display for message history
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('../electronAppHelper');
const { clickChatHeader } = require('../chatHeaderActions');

let appHelper;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
}, { timeout: 30000 });

test.afterAll(async () => {
  await appHelper.close();
});

test.describe('Msg History Display Card', () => {
  test('should show msg history card after header toggle', async () => {
    // Save some messages first
    const messages = [
      { role: 'user', content: 'Hello E2E' },
      { role: 'assistant', content: 'E2E Response' }
    ];
    await appHelper.saveChatHistory(messages);

    await appHelper.relaunch();
    await appHelper.waitForSelector('.app-container', { timeout: 15000 });
    await appHelper.waitForTimeout(500);

    await clickChatHeader(appHelper);
    await appHelper.waitForTimeout(200);

    // Verify the card is rendered
    const card = await appHelper.waitForSelector('.msg-history-card', { timeout: 5000 });
    expect(card).toBeTruthy();

    // Verify JSON content contains msgs structure
    const jsonText = await appHelper.textContent('.msg-history-json');
    const parsed = JSON.parse(jsonText);
    expect(parsed).toHaveProperty('msgs');
  });

  test('should show empty state when no messages', async () => {
    // Clear history
    await appHelper.saveChatHistory([]);

    await appHelper.relaunch();
    await appHelper.waitForSelector('.app-container', { timeout: 15000 });
    await appHelper.waitForTimeout(500);

    await clickChatHeader(appHelper);
    await appHelper.waitForTimeout(200);

    // Should show empty state text
    const emptyText = await appHelper.textContent('.chat-history');
    expect(emptyText).toContain('暂无消息历史记录');
  });
});
