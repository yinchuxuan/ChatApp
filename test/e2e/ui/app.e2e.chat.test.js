/**
 * E2E Tests - Chat Panel
 * Tests Chat panel interactions and API request toggle
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('../electronAppHelper');
const { revealChatHeader, clickChatHeader, getChatHeaderTitle } = require('../chatHeaderActions');

let appHelper;

test.describe.configure({ mode: 'serial' });

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
    const currentTitle = await getChatHeaderTitle(appHelper);

    if (currentTitle === 'msg历史记录') {
      await clickChatHeader(appHelper);
      await appHelper.waitForTimeout(200);
    }

    await clickChatHeader(appHelper);
    await appHelper.waitForTimeout(200);

    const titleText = await getChatHeaderTitle(appHelper);
    expect(titleText).toBe('msg历史记录');

    const historyDiv = await appHelper.waitForSelector('.chat-history', { state: 'visible' });
    expect(historyDiv).toBeTruthy();
    expect(await appHelper.textContent('.chat-history')).toBeTruthy();
  });

  test('should toggle back to Chat panel when clicking chat-header again', async () => {
    const currentTitle = await getChatHeaderTitle(appHelper);
    if (currentTitle === '未加载游戏卡') {
      await clickChatHeader(appHelper);
      await appHelper.waitForTimeout(200);
    }

    await clickChatHeader(appHelper);
    await appHelper.waitForTimeout(200);

    const chatTitle = await getChatHeaderTitle(appHelper);
    expect(chatTitle).toBe('未加载游戏卡');
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
test.describe('Chat Panel Header Actions', () => {
  test('should not expose the legacy clear history button', async () => {
    await revealChatHeader(appHelper);
    const count = await appHelper.evaluate(() => document.querySelectorAll('.chat-header-clear-btn').length);
    expect(count).toBe(0);
  });
  test('should keep session and import buttons inside the title control with right spacing', async () => {
    await revealChatHeader(appHelper);
    const result = await appHelper.evaluate(() => {
      const title = document.querySelector('.game-card-title-control');
      const session = title?.querySelector('.chat-session-btn');
      const importBtn = title?.querySelector('.game-card-import-btn');
      if (!title || !session || !importBtn) return null;
      const headerRect = document.querySelector('.chat-header').getBoundingClientRect();
      const importRect = importBtn.getBoundingClientRect();
      return {
        hasSession: true,
        hasImport: true,
        rightGap: Math.round(headerRect.right - importRect.right),
        paddingRight: window.getComputedStyle(title).paddingRight
      };
    });
    expect(result).not.toBeNull();
    expect(result.hasSession).toBe(true); expect(result.hasImport).toBe(true);
    expect(result.rightGap).toBeGreaterThanOrEqual(70);
    expect(result.paddingRight).toBe('54px');
  });
  test('should show BGM toggle next to session management', async () => {
    await revealChatHeader(appHelper);
    const result = await appHelper.evaluate(() => {
      const actions = document.querySelector('.game-card-title-actions');
      const bgm = actions?.querySelector('.game-card-bgm-btn');
      const session = actions?.querySelector('.chat-session-btn');
      const icon = bgm?.querySelector('.material-icons');
      if (!actions || !bgm || !session) return null;
      return {
        icon: bgm.textContent.trim(),
        mask: window.getComputedStyle(icon).getPropertyValue('--icon-mask'),
        bgmRight: Math.round(bgm.getBoundingClientRect().right),
        sessionLeft: Math.round(session.getBoundingClientRect().left)
      };
    });
    expect(result).not.toBeNull();
    expect(result.icon).toBe('music_note');
    expect(result.mask).toContain('svg');
    expect(result.mask).toContain('path');
    expect(result.sessionLeft - result.bgmRight).toBeGreaterThanOrEqual(0);
    expect(result.sessionLeft - result.bgmRight).toBeLessThanOrEqual(12);
  });
});
