/**
 * E2E Tests - Message Collapse Behavior (app-001)
 * Verifies last user message pinning, collapsed history, scroll-to-expand,
 * and assistant response positioning with actual user-visible behavior.
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('./electronAppHelper');

let appHelper;

async function injectMessages(messages) {
  // Save via IPC (writes to disk)
  await appHelper.saveChatHistory(messages);
  await appHelper.waitForTimeout(500);
  // Use evaluate to have React reload from IPC by reloading the page
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

    const childRoles = await appHelper.evaluate(() => {
      const wrapper = document.querySelector('.collapse-inner-wrapper');
      return Array.from(wrapper.children)
        .filter(el => el.classList.contains('chat-message'))
        .map(el => [...el.classList].find(c => c === 'user' || c === 'assistant'));
    });

    expect(childRoles.length).toBeGreaterThanOrEqual(1);
    expect(childRoles[0]).toBe('user');

    const hasDivider = await appHelper.evaluate(() => {
      return !!document.querySelector('.pinned-divider');
    });
    expect(hasDivider).toBe(true);

    const lastUserContent = await appHelper.evaluate(() => {
      const wrapper = document.querySelector('.collapse-inner-wrapper');
      const firstMsg = wrapper.querySelector(':scope > .chat-message');
      return firstMsg ? firstMsg.textContent : '';
    });
    expect(lastUserContent).toContain('Show me useEffect');
  });

  test('should expand history on scroll-up gesture', async () => {
    await injectMessages(MULTI_TURN);
    await waitForCollapseView();
    await appHelper.waitForSelector('.collapsed-history-indicator', { state: 'visible' });

    const viewEl = await appHelper.waitForSelector('.collapsed-message-view');
    const box = await viewEl.boundingBox();
    expect(box).toBeTruthy();

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await appHelper.getWindow().mouse.move(centerX, centerY);
    // Simulate multiple quick scroll-up events to build up pull accumulator
    for (let i = 0; i < 5; i++) {
      await appHelper.getWindow().mouse.wheel(0, -100);
      await appHelper.waitForTimeout(30);
    }
    await appHelper.waitForTimeout(300);

    const indicatorVisible = await appHelper.isVisible('.collapsed-history-indicator');
    expect(indicatorVisible).toBe(false);

    const priorMessages = await appHelper.evaluate(() => {
      const container = document.querySelector('.collapsed-message-view');
      return Array.from(container.querySelectorAll('.chat-message')).length;
    });
    expect(priorMessages).toBeGreaterThan(1);

    const expanded = await appHelper.evaluate(() => {
      const view = document.querySelector('.collapsed-message-view');
      return view.classList.contains('expanded');
    });
    expect(expanded).toBe(true);
  });

  test('should position assistant response below pinned user message', async () => {
    // Messages where the assistant response is in the pinned section
    // (comes after the last user message that triggers collapse)
    const msgs = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'What is 2+2?' },
      { role: 'assistant', content: 'It is 4.' },
    ];
    await injectMessages(msgs);
    await waitForCollapseView();

    const result = await appHelper.evaluate(() => {
      const wrapper = document.querySelector('.collapse-inner-wrapper');
      const children = Array.from(wrapper.children);
      // Find visible (non-collapsed) messages
      const visibleMsgs = [];
      for (const child of children) {
        if (child.classList.contains('chat-message')) {
          visibleMsgs.push({
            role: [...child.classList].find(c => c === 'user' || c === 'assistant'),
            content: child.textContent.trim(),
            domIndex: children.indexOf(child),
          });
        }
      }
      return visibleMsgs;
    });

    // Should see pinned divider and at least the last user + assistant
    expect(result.length).toBeGreaterThanOrEqual(2);

    // Last user message should be first visible (pinned at top)
    expect(result[0].role).toBe('user');
    expect(result[0].content).toContain('2+2');

    // Assistant response should be after the pinned user message
    expect(result[1].role).toBe('assistant');
    expect(result[1].content).toContain('4');
    expect(result[1].domIndex).toBeGreaterThan(result[0].domIndex);
  });
});
