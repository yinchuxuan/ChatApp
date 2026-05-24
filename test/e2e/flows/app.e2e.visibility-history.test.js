/**
 * E2E Tests: Visibility and history with mocked API
 */
const { test, expect } = require('@playwright/test');
const { revealChatHeader, getChatHeaderTitle } = require('../chatHeaderActions');
const { setupHooks } = require('../mockApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureApp, send, openAiStream, getAppHelper } = setupHooks();

test.describe('Visibility and history', () => {
  test('llm_only messages saved to history but hidden in UI', async () => {
    const card = {
      version: '1.0', id: 'vis_llm', name: 'Vis LLM',
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'secret system prompt', _meta: { visibility: 'llm_only' } }] }]
    };
    await configureApp(card);
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('hello');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(2);

    const saved = (await getAppHelper().getChatHistory()).messages;
    expect(saved.some(m => m.content === 'secret system prompt')).toBe(true);

    const historyText = await getAppHelper().window.locator('.chat-history').textContent();
    expect(historyText).not.toContain('secret system prompt');
  });

  test('system messages saved to history but hidden in dialogue UI', async () => {
    const card = {
      version: '1.0', id: 'vis_system', name: 'Vis System',
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'plain system prompt' }] }]
    };
    await configureApp(card);
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('hello');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(3);

    const saved = (await getAppHelper().getChatHistory()).messages;
    expect(saved.some(m => m.role === 'system' && m.content === 'plain system prompt')).toBe(true);

    const historyText = await getAppHelper().window.locator('.chat-history').textContent();
    expect(historyText).toContain('hello');
    expect(historyText).toContain('ok');
    expect(historyText).not.toContain('plain system prompt');
  });

  test('game card control shows active card name', async () => {
    const card = { version: '1.0', id: 'name_card', name: 'My Adventure', rules: [] };
    await configureApp(card);
    await revealChatHeader(getAppHelper());
    const titleText = await getChatHeaderTitle(getAppHelper());
    expect(titleText).toContain('My Adventure');
  });
});
