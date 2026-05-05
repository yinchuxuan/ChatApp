/**
 * E2E Tests - Retry Button (app-001)
 * Verifies retry button visibility and click behavior
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('./electronAppHelper');

let appHelper;

async function injectMessages(messages) {
  await appHelper.saveChatHistory(messages);
  await appHelper.waitForTimeout(500);
  await appHelper.getWindow().reload();
  await appHelper.waitForSelector('.app-container', { timeout: 15000 });
  await appHelper.waitForTimeout(1000);
}

test.describe.serial('Retry Button', () => {
  test.beforeAll(async () => {
    appHelper = new ElectronAppHelper();
    await appHelper.launch();
  }, { timeout: 30000 });

  test.afterAll(async () => {
    await appHelper.close();
  });

  test('should NOT show retry button when no messages', async () => {
    const count = await appHelper.evaluate(() => {
      return document.querySelectorAll('.retry-btn').length;
    });
    expect(count).toBe(0);
  });

  test('should show retry button on last assistant message with _thinking', async () => {
    await injectMessages([
      { role: 'user', content: 'What is JavaScript?' },
      { role: 'assistant', content: 'JavaScript is a programming language.', _thinking: 'Defining JavaScript...' }
    ]);

    // Hover over the last message row to reveal the retry button
    await appHelper.hover('.chat-message-row:last-of-type');

    const retryBtnVisible = await appHelper.isVisible('.retry-btn');
    expect(retryBtnVisible).toBe(true);

    const ariaLabel = await appHelper.evaluate(() => {
      const btn = document.querySelector('.retry-btn');
      return btn ? btn.getAttribute('aria-label') : null;
    });
    expect(ariaLabel).toBe('重新生成回复');
  });

  test('should have only ONE retry button for multi-turn conversation', async () => {
    await injectMessages([
      { role: 'user', content: 'What is React?' },
      { role: 'assistant', content: 'React is a JS library.', _thinking: 'thinking 1' },
      { role: 'user', content: 'How do hooks work?' },
      { role: 'assistant', content: 'Hooks let you use state.', _thinking: 'thinking 2' }
    ]);

    const retryCount = await appHelper.evaluate(() => {
      return document.querySelectorAll('.retry-btn').length;
    });
    expect(retryCount).toBe(1);
  });

  test('should NOT show retry button on earlier assistant messages', async () => {
    await injectMessages([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer', _thinking: 'think 1' },
      { role: 'user', content: 'Second question' },
      { role: 'assistant', content: 'Second answer', _thinking: 'think 2' }
    ]);

    // Find all chat-message-row divs and check which ones have retry buttons
    const result = await appHelper.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.chat-message-row'));
      return rows.map(r => ({
        hasRetry: r.querySelector('.retry-btn') !== null,
        hasMsg: r.querySelector('.chat-message.assistant') !== null
      }));
    });

    // Only the last assistant message row should have a retry button
    const withRetry = result.filter(m => m.hasRetry);
    expect(withRetry.length).toBe(1);
  });

  test('should have correct icon in retry button', async () => {
    await injectMessages([
      { role: 'user', content: 'Test question' },
      { role: 'assistant', content: 'Test answer', _thinking: 'thinking' }
    ]);

    const btnInfo = await appHelper.evaluate(() => {
      const btn = document.querySelector('.retry-btn');
      if (!btn) return null;
      const icon = btn.querySelector('.material-icons');
      return {
        hasRefreshIcon: icon ? icon.textContent === 'refresh' : false,
        hasMdBtn: btn.classList.contains('md-btn'),
        title: btn.getAttribute('title')
      };
    });
    expect(btnInfo).not.toBeNull();
    expect(btnInfo.hasRefreshIcon).toBe(true);
    expect(btnInfo.hasMdBtn).toBe(true);
    expect(btnInfo.title).toBe('重新生成');
  });
});
