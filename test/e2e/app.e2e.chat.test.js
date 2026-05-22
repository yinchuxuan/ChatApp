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
    const inputField = await appHelper.waitForSelector('.chat-input-area .chat-input-textarea', { state: 'attached' });
    expect(inputField).toBeTruthy();
  });

  test('should have send button', async () => {
    const sendBtn = await appHelper.waitForSelector('.chat-input-area button[type="submit"]', { state: 'attached' });
    expect(sendBtn).toBeTruthy();
  });
  test('should display empty state message', async () => {
    await appHelper.waitForTimeout(200);
    const chatEmpty = await appHelper.waitForSelector('.chat-empty');
    expect(chatEmpty).toBeTruthy();
    const emptyText = await appHelper.textContent('.chat-empty');
    expect(emptyText).toContain('开始对话');
  });
});
test.describe('Chat Panel Msg History Toggle', () => {
  test('should have Chat panel input area', async () => {
    const chatInput = await appHelper.waitForSelector('.chat-input-area .chat-input-textarea', { state: 'attached' });
    expect(chatInput).toBeTruthy();
  });

  test('should have submit button', async () => {
    const submitBtn = await appHelper.waitForSelector('.chat-input-area button[type="submit"]', { state: 'attached' });
    expect(submitBtn).toBeTruthy();
  });

  test('should verify Chat header and history structure', async () => {
    const chatHeader = await appHelper.waitForSelector('.chat-header', { state: 'attached' });
    expect(chatHeader).toBeTruthy();

    const chatHistory = await appHelper.waitForSelector('.chat-history', { state: 'attached' });
    expect(chatHistory).toBeTruthy();
  });

  test('should have clickable chat-header for toggle', async () => {
    const chatHeaderClickable = await appHelper.waitForSelector('.chat-header-clickable', { state: 'attached' });
    expect(chatHeaderClickable).toBeTruthy();
  });

  test('should toggle to msg history display when clicking chat-header', async () => {
    // Hover near top edge to reveal the header
    const chatPanel = await appHelper.waitForSelector('.chat-panel');
    await chatPanel.hover({ position: { x: 200, y: 20 } });
    await appHelper.waitForTimeout(100);

    const currentTitle = await appHelper.evaluate(() => {
      const title = document.querySelector('.chat-header .header-title');
      return title ? title.textContent : '';
    });

    if (currentTitle === 'msg历史记录') {
      await appHelper.click('.chat-header-clickable');
      await appHelper.waitForTimeout(200);
    }

    await appHelper.click('.chat-header-clickable');
    await appHelper.waitForTimeout(200);

    const titleText = await appHelper.evaluate(() => {
      const title = document.querySelector('.chat-header .header-title');
      return title ? title.textContent : '';
    });
    expect(titleText).toBe('msg历史记录');

    const historyDiv = await appHelper.waitForSelector('.chat-history', { state: 'visible' });
    expect(historyDiv).toBeTruthy();
    expect(await appHelper.textContent('.chat-history')).toBeTruthy();
  });

  test('should toggle back to Chat panel when clicking chat-header again', async () => {
    // Hover near top edge to reveal the header
    const chatPanel = await appHelper.waitForSelector('.chat-panel');
    await chatPanel.hover({ position: { x: 200, y: 20 } });
    await appHelper.waitForTimeout(100);

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

  test('should have chat-history with overflow scrolling enabled', async () => {
    const overflowY = await appHelper.evaluate(() => {
      const el = document.querySelector('.chat-history');
      if (!el) return null;
      return window.getComputedStyle(el).overflowY;
    });
    expect(overflowY).toBe('auto');
  });

  test('should not have custom scrollbar UI components in chat panel', async () => {
    const count = await appHelper.evaluate(() => {
      const els = document.querySelectorAll('[class*="scrollbar"], [class*="scroll-bar"], [class*="custom-scroll"]');
      return els.length;
    });
    expect(count).toBe(0);
  });

  test('should not have separate toggle button', async () => {
    const toggleBtnCount = await appHelper.evaluate(() => {
      const chatPanel = document.querySelector('.chat-panel');
      if (!chatPanel) return -1;
      const chatHeader = chatPanel.querySelector('.chat-header');
      let count = 0;
      chatPanel.querySelectorAll('button').forEach(btn => {
        if (btn.closest('.chat-header') === chatHeader) return;
        if (/toggle|切换|api request/i.test(btn.textContent || '')) count++;
      });
      return count;
    });
    expect(toggleBtnCount).toBe(0);
  });
});
test.describe('Chat Panel Clear History', () => {
  test('should not have clear button when no messages, appear after sending message', async () => {
    expect(await appHelper.evaluate(() => document.querySelectorAll('.chat-header-clear-btn').length)).toBe(0);
    // Trigger hover via JS to avoid pointer interception by .chat-input-area
    await appHelper.evaluate(() => {
      const el = document.querySelector('.chat-input-hover-trigger');
      if (el) {
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    });
    await appHelper.waitForTimeout(200);
    const inputField = await appHelper.waitForSelector('.chat-input-area .chat-input-textarea');
    await inputField.fill('e2e clear test'); await appHelper.waitForTimeout(100);
    await (await appHelper.waitForSelector('.chat-input-area button[type="submit"]')).click();
    await appHelper.waitForTimeout(300);
    const clearBtn = await appHelper.waitForSelector('.chat-header-clear-btn', { state: 'attached', timeout: 5000 });
    expect(clearBtn).toBeTruthy();
  });
  test('should clear messages when clicking the clear button and show empty state', async () => {
    // Trigger hover via JS to avoid pointer interception by .chat-input-area
    await appHelper.evaluate(() => {
      const el = document.querySelector('.chat-input-hover-trigger');
      if (el) {
        el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    });
    await appHelper.waitForTimeout(200);
    const inputField = await appHelper.waitForSelector('.chat-input-area .chat-input-textarea');
    await inputField.fill('e2e clear test'); await appHelper.waitForTimeout(100);
    await (await appHelper.waitForSelector('.chat-input-area button[type="submit"]')).click();
    await appHelper.waitForTimeout(300);
    // Hover top edge to reveal header
    const chatPanel = await appHelper.waitForSelector('.chat-panel');
    await chatPanel.hover({ position: { x: 200, y: 20 } });
    await appHelper.waitForTimeout(200);
    await appHelper.waitForSelector('.chat-header-clear-btn', { state: 'visible', timeout: 5000 });
    await appHelper.evaluate(() => { document.querySelector('.chat-header-clear-btn')?.click(); });
    await appHelper.waitForTimeout(300);
    const countAfter = await appHelper.evaluate(() => document.querySelectorAll('.chat-header-clear-btn').length);
    expect(countAfter).toBe(0);
    const chatEmpty = await appHelper.waitForSelector('.chat-empty', { timeout: 5000 });
    expect(chatEmpty).toBeTruthy();
  });
  test('clear button should have correct attributes and icon', async () => {
    // Hover bottom edge to reveal input area
    await (await appHelper.waitForSelector('.chat-input-hover-trigger', { state: 'attached' })).hover();
    await appHelper.waitForTimeout(200);
    const inputField = await appHelper.waitForSelector('.chat-input-area .chat-input-textarea');
    await inputField.fill('e2e attr test'); await appHelper.waitForTimeout(100);
    await (await appHelper.waitForSelector('.chat-input-area button[type="submit"]')).click();
    await appHelper.waitForTimeout(300);
    const result = await appHelper.evaluate(() => {
      const btn = document.querySelector('.chat-header-clear-btn');
      if (!btn) return null;
      return { hasMdBtn: btn.classList.contains('md-btn'), hasMdBtnIcon: btn.classList.contains('md-btn-icon'),
        ariaLabel: btn.getAttribute('aria-label'), iconName: btn.querySelector('.material-icons')?.textContent };
    });
    expect(result).not.toBeNull();
    expect(result.hasMdBtn).toBe(true); expect(result.hasMdBtnIcon).toBe(true);
    expect(result.ariaLabel).toBe('清空聊天历史'); expect(result.iconName).toBe('delete_sweep');
  });
});