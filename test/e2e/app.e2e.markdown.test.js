/**
 * E2E Tests - Markdown Rendering
 * Tests that markdown content in chat messages is rendered as HTML elements
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

test.describe('Markdown Rendering', () => {
  async function typeAndSend(text) {
    // Hover trigger zone with force to bypass any overlapping elements
    const trigger = await appHelper.waitForSelector('.chat-input-hover-trigger', { state: 'attached' });
    await trigger.hover({ force: true });
    await appHelper.waitForTimeout(200);
    const inputField = await appHelper.waitForSelector('.chat-input-area .chat-input-textarea');
    await inputField.fill(text);
    await appHelper.waitForTimeout(100);
    await (await appHelper.waitForSelector('.chat-input-area button[type="submit"]')).click();
    await appHelper.waitForTimeout(500);
  }

  test('should render bold markdown as <strong> element', async () => {
    await typeAndSend('**bold text**');

    const strongCount = await appHelper.evaluate(() => {
      const bubbles = document.querySelectorAll('.chat-message.user .chat-bubble-content');
      let count = 0;
      bubbles.forEach(el => {
        if (el.querySelector('strong')) count++;
      });
      return count;
    });
    expect(strongCount).toBeGreaterThan(0);
  });

  test('should render italic markdown as <em> element', async () => {
    await typeAndSend('*italic text*');

    const emCount = await appHelper.evaluate(() => {
      const bubbles = document.querySelectorAll('.chat-message.user .chat-bubble-content');
      let count = 0;
      bubbles.forEach(el => {
        if (el.querySelector('em')) count++;
      });
      return count;
    });
    expect(emCount).toBeGreaterThan(0);
  });

  test('should render code markdown as <code> element', async () => {
    await typeAndSend('`inline code`');

    const codeCount = await appHelper.evaluate(() => {
      const bubbles = document.querySelectorAll('.chat-message.user .chat-bubble-content');
      let count = 0;
      bubbles.forEach(el => {
        if (el.querySelector('code')) count++;
      });
      return count;
    });
    expect(codeCount).toBeGreaterThan(0);
  });

  test('should render link markdown as <a> element', async () => {
    await typeAndSend('[click here](https://example.com)');

    const linkCount = await appHelper.evaluate(() => {
      const bubbles = document.querySelectorAll('.chat-message.user .chat-bubble-content');
      let count = 0;
      bubbles.forEach(el => {
        if (el.querySelector('a')) count++;
      });
      return count;
    });
    expect(linkCount).toBeGreaterThan(0);
  });

  test('should render header markdown as <h1> element', async () => {
    await typeAndSend('# Header Title');

    const headerCount = await appHelper.evaluate(() => {
      const bubbles = document.querySelectorAll('.chat-message.user .chat-bubble-content');
      let count = 0;
      bubbles.forEach(el => {
        if (el.querySelector('h1')) count++;
      });
      return count;
    });
    expect(headerCount).toBeGreaterThan(0);
  });

  test('should render list markdown as <ul>/<li> elements', async () => {
    await typeAndSend('- item one\n- item two');

    const listCount = await appHelper.evaluate(() => {
      const bubbles = document.querySelectorAll('.chat-message.user .chat-bubble-content');
      let count = 0;
      bubbles.forEach(el => {
        if (el.querySelector('ul') || el.querySelector('li')) count++;
      });
      return count;
    });
    expect(listCount).toBeGreaterThan(0);
  });

  test('should strip dangerous HTML tags (XSS protection)', async () => {
    await typeAndSend('<script>alert("xss")</script>');

    const scriptCount = await appHelper.evaluate(() => {
      const bubbles = document.querySelectorAll('.chat-message.user .chat-bubble-content');
      let count = 0;
      bubbles.forEach(el => {
        if (el.querySelector('script')) count++;
      });
      return count;
    });
    expect(scriptCount).toBe(0);
  });
});
