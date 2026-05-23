/**
 * E2E Tests - Chat Card Side Padding
 * Verifies that chat-history uses clamp(20px, 8vw, 96px) horizontal padding
 * matching the reading column veil design.
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
  test('chat-history should have clamp(20px, 8vw, 96px) horizontal padding', async () => {
    // Verify the padding matches the CSS rule: clamp(20px, 8vw, 96px)
    // At typical E2E window size (1280px), 8vw = 102.4px, clamped to 96px
    const paddingInfo = await appHelper.evaluate(() => {
      const el = document.querySelector('.chat-history');
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      const width = el.clientWidth;
      const paddingLeft = parseFloat(styles.paddingLeft);
      const paddingRight = parseFloat(styles.paddingRight);
      // clamp(20px, 8vw, 96px): at width W, expected = min(max(20, 0.08*W), 96)
      const expectedClamped = Math.min(Math.max(20, 0.08 * width), 96);
      return {
        width,
        paddingLeft,
        paddingRight,
        expectedClamped,
        matches: Math.abs(paddingLeft - expectedClamped) < 5 && Math.abs(paddingRight - expectedClamped) < 5
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
      const expectedClamped = Math.min(Math.max(20, 0.08 * width), 96);
      return {
        width,
        paddingLeft,
        expectedClamped,
        matches: Math.abs(paddingLeft - expectedClamped) < 5
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
      const expectedClamped = Math.min(Math.max(20, 0.08 * width), 96);
      return {
        width,
        paddingRight,
        expectedClamped,
        matches: Math.abs(paddingRight - expectedClamped) < 5
      };
    });

    expect(paddingInfo).not.toBeNull();
    expect(paddingInfo.matches).toBe(true);
  });
});
