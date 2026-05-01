/**
 * E2E Tests - Chat Card Side Padding
 * Verifies that all chat area cards have 10% left/right side padding
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('./electronAppHelper');

let appHelper;

test.beforeAll(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
}, { timeout: 30000 });

test.afterAll(async () => {
  await appHelper.close();
});

test.describe('Chat Card Side Padding', () => {
  test('chat-history should have 10% horizontal padding', async () => {
    // Get the container width and padding to verify 10% ratio
    const paddingInfo = await appHelper.evaluate(() => {
      const el = document.querySelector('.chat-history');
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      const width = el.clientWidth;
      const paddingLeft = parseFloat(styles.paddingLeft);
      const paddingRight = parseFloat(styles.paddingRight);
      const expectedPadding = width * 0.10;
      // Allow some tolerance for rounding
      return {
        width,
        paddingLeft,
        paddingRight,
        expectedPadding,
        matches: Math.abs(paddingLeft - expectedPadding) < 5 && Math.abs(paddingRight - expectedPadding) < 5
      };
    });

    expect(paddingInfo).not.toBeNull();
    expect(paddingInfo.matches).toBe(true);
  });

  test('user message card should be rendered within padded container', async () => {
    const messages = [
      { role: 'user', content: 'Padding test' }
    ];
    await appHelper.saveChatHistory(messages);
    await appHelper.relaunch();
    await appHelper.waitForSelector('.app-container', { timeout: 15000 });
    await appHelper.waitForTimeout(500);

    const userMsg = await appHelper.waitForSelector('.chat-message.user', { state: 'visible' });
    expect(userMsg).toBeTruthy();

    const paddingInfo = await appHelper.evaluate(() => {
      const el = document.querySelector('.chat-history');
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      const width = el.clientWidth;
      const paddingLeft = parseFloat(styles.paddingLeft);
      const expectedPadding = width * 0.10;
      return {
        width,
        paddingLeft,
        expectedPadding,
        matches: Math.abs(paddingLeft - expectedPadding) < 5
      };
    });

    expect(paddingInfo).not.toBeNull();
    expect(paddingInfo.matches).toBe(true);
  });

  test('assistant message card should be rendered within padded container', async () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];
    await appHelper.saveChatHistory(messages);
    await appHelper.relaunch();
    await appHelper.waitForSelector('.app-container', { timeout: 15000 });
    await appHelper.waitForTimeout(500);

    const assistantMsg = await appHelper.waitForSelector('.chat-message.assistant', { state: 'visible' });
    expect(assistantMsg).toBeTruthy();

    const paddingInfo = await appHelper.evaluate(() => {
      const el = document.querySelector('.chat-history');
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      const width = el.clientWidth;
      const paddingRight = parseFloat(styles.paddingRight);
      const expectedPadding = width * 0.10;
      return {
        width,
        paddingRight,
        expectedPadding,
        matches: Math.abs(paddingRight - expectedPadding) < 5
      };
    });

    expect(paddingInfo).not.toBeNull();
    expect(paddingInfo.matches).toBe(true);
  });
});
