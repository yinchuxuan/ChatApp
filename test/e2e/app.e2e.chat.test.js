/**
 * E2E Tests - Chat Panel
 * Tests Chat panel interactions and API request toggle
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

test.describe('Chat Panel Interaction', () => {
  test('should have input field for questions', async () => {
    const inputField = await appHelper.waitForSelector('.chat-input-area .md-input');
    expect(inputField).toBeTruthy();
  });

  test('should have send button', async () => {
    const sendBtn = await appHelper.waitForSelector('.chat-input-area button[type="submit"]');
    expect(sendBtn).toBeTruthy();
  });

  test('should display empty state message', async () => {
    // Wait for Babel to transpile scripts and renderers to be available
    await appHelper.waitForTimeout(200);
    const chatEmpty = await appHelper.waitForSelector('.chat-empty');
    expect(chatEmpty).toBeTruthy();

    const emptyText = await appHelper.textContent('.chat-empty');
    expect(emptyText).toContain('开始对话');
  });
});

test.describe('Chat Panel API Request Toggle', () => {
  test('should have Chat panel input area', async () => {
    const chatInput = await appHelper.waitForSelector('.chat-input-area .md-input');
    expect(chatInput).toBeTruthy();
  });

  test('should have submit button', async () => {
    const submitBtn = await appHelper.waitForSelector('.chat-input-area button[type="submit"]');
    expect(submitBtn).toBeTruthy();
  });

  test('should verify Chat header and history structure', async () => {
    const chatHeader = await appHelper.waitForSelector('.chat-header');
    expect(chatHeader).toBeTruthy();

    const chatHistory = await appHelper.waitForSelector('.chat-history');
    expect(chatHistory).toBeTruthy();
  });

  test('should have clickable chat-header for toggle', async () => {
    const chatHeaderClickable = await appHelper.waitForSelector('.chat-header-clickable');
    expect(chatHeaderClickable).toBeTruthy();
  });

  test('should toggle to API request display when clicking chat-header', async () => {
    const currentTitle = await appHelper.evaluate(() => {
      const title = document.querySelector('.chat-header .header-title');
      return title ? title.textContent : '';
    });

    if (currentTitle === 'API请求') {
      await appHelper.click('.chat-header-clickable');
      await appHelper.waitForTimeout(200);
    }

    await appHelper.click('.chat-header-clickable');
    await appHelper.waitForTimeout(200);

    const titleText = await appHelper.evaluate(() => {
      const title = document.querySelector('.chat-header .header-title');
      return title ? title.textContent : '';
    });
    expect(titleText).toBe('API请求');

    const emptyState = await appHelper.waitForSelector('.chat-empty, .chat-api-request-display');
    expect(emptyState).toBeTruthy();
  });

  test('should toggle back to Chat panel when clicking chat-header again', async () => {
    const currentTitle = await appHelper.evaluate(() => {
      const title = document.querySelector('.chat-header .header-title');
      return title ? title.textContent : '';
    });

    if (currentTitle === '聊天') {
      await appHelper.click('.chat-header-clickable');
      await appHelper.waitForTimeout(200);
    }

    await appHelper.click('.chat-header-clickable');
    await appHelper.waitForTimeout(200);

    const chatTitle = await appHelper.evaluate(() => {
      const title = document.querySelector('.chat-header .header-title');
      return title ? title.textContent : '';
    });
    expect(chatTitle).toBe('聊天');
  });

  test('should not have separate toggle button', async () => {
    const toggleBtnCount = await appHelper.evaluate(() => {
      const chatPanel = document.querySelector('.chat-panel');
      if (!chatPanel) return -1;

      const chatHeader = chatPanel.querySelector('.chat-header');
      const allButtons = chatPanel.querySelectorAll('button');

      let count = 0;
      allButtons.forEach(btn => {
        if (btn.closest('.chat-header') === chatHeader) return;

        const text = btn.textContent || '';
        if (text.includes('toggle') || text.includes('切换') || text.toLowerCase().includes('api request')) {
          count++;
        }
      });
      return count;
    });
    expect(toggleBtnCount).toBe(0);
  });
});