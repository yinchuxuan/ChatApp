/**
 * E2E Tests - Message Collapse Behavior (app-001)
 * Verifies last user message pinning, collapsed history, drag-to-expand,
 * and assistant response positioning with actual user-visible behavior.
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

async function waitForCollapseView() {
  await appHelper.waitForSelector('.collapsed-message-view', { timeout: 10000 });
}

const MULTI_TURN = [
  { role: 'user', content: 'What is React?' },
  { role: 'assistant', content: 'React is a JavaScript library for building UIs.' },
  { role: 'user', content: 'How do hooks work?' },
  { role: 'assistant', content: 'Hooks let you use state in functional components.' },
  { role: 'user', content: 'Show me useEffect' },
];

test.describe.serial('Message Collapse Behavior', () => {
  test.beforeAll(async () => {
    appHelper = new ElectronAppHelper();
    await appHelper.launch();
  }, { timeout: 30000 });

  test.afterAll(async () => {
    await appHelper.close();
  });

  test('should show collapsed-history-indicator with earlier messages not in DOM', async () => {
    await injectMessages(MULTI_TURN);
    await waitForCollapseView();

    const indicator = await appHelper.waitForSelector('.collapsed-history-indicator', { state: 'visible' });
    expect(indicator).toBeTruthy();

    const indicatorText = await appHelper.textContent('.collapsed-history-indicator');
    expect(indicatorText).toContain('条更早的消息');

    const collapsedMsgCount = await appHelper.evaluate(() => {
      const container = document.querySelector('.collapsed-history');
      if (!container) return null;
      return container.querySelectorAll('.chat-message').length;
    });
    expect(collapsedMsgCount).toBe(0);
  });

  test('should show last user message pinned at top with divider', async () => {
    await injectMessages(MULTI_TURN);
    await waitForCollapseView();

    const hasDivider = await appHelper.evaluate(() => {
      return !!document.querySelector('.pinned-divider');
    });
    expect(hasDivider).toBe(true);

    const pinnedMessages = await appHelper.evaluate(() => {
      const view = document.querySelector('.collapsed-message-view');
      return Array.from(view.children)
        .filter(el => el.classList.contains('chat-message'))
        .map(el => ({
          role: [...el.classList].find(c => c === 'user' || c === 'assistant'),
          content: el.textContent.trim(),
        }));
    });

    expect(pinnedMessages.length).toBeGreaterThanOrEqual(1);
    expect(pinnedMessages[0].role).toBe('user');
    expect(pinnedMessages[0].content).toContain('Show me useEffect');
  });

  test('should expand history on drag-down gesture', async () => {
    await injectMessages(MULTI_TURN);
    await waitForCollapseView();
    await appHelper.waitForSelector('.collapsed-history-indicator', { state: 'visible' });

    const viewEl = await appHelper.waitForSelector('.collapsed-message-view');
    const box = await viewEl.boundingBox();
    expect(box).toBeTruthy();

    const startX = box.x + box.width / 2;
    const startY = box.y + 20;
    const endY = startY + 80;

    await appHelper.getWindow().mouse.move(startX, startY);
    await appHelper.getWindow().mouse.down();
    await appHelper.getWindow().mouse.move(startX, endY, { steps: 5 });
    await appHelper.waitForTimeout(300);
    await appHelper.getWindow().mouse.up();
    await appHelper.waitForTimeout(500);

    const indicatorVisible = await appHelper.isVisible('.collapsed-history-indicator');
    expect(indicatorVisible).toBe(false);

    const allMessages = await appHelper.evaluate(() => {
      return Array.from(document.querySelectorAll('.collapsed-message-view .chat-message')).length;
    });
    expect(allMessages).toBeGreaterThan(1);

    const expanded = await appHelper.evaluate(() => {
      const view = document.querySelector('.collapsed-message-view');
      return view.classList.contains('expanded');
    });
    expect(expanded).toBe(true);
  });

  test('should position assistant response below pinned user message', async () => {
    const msgs = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: 'It is 4.' },
    ];
    await injectMessages(msgs);
    await waitForCollapseView();

    const result = await appHelper.evaluate(() => {
      const view = document.querySelector('.collapsed-message-view');
      const children = Array.from(view.children);
      return children
        .filter(el => el.classList.contains('chat-message'))
        .map(el => ({
          role: [...el.classList].find(c => c === 'user' || c === 'assistant'),
          content: el.textContent.trim(),
          domIndex: children.indexOf(el),
        }));
    });

    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('2+2');
    expect(result[1].role).toBe('assistant');
    expect(result[1].content).toContain('4');
    expect(result[1].domIndex).toBeGreaterThan(result[0].domIndex);
  });
});
