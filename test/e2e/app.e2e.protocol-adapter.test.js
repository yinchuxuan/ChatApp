/**
 * E2E Tests: Protocol adapter with game card, mocked API
 */
const { test, expect } = require('@playwright/test');
const { setupHooks } = require('./mockApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureApp, send, openAiStream, anthropicStream, getAppHelper } = setupHooks();

test.describe('Protocol adapter with game card', () => {
  test('OpenAI keeps system messages in messages array', async () => {
    const card = {
      version: '1.0', id: 'openai_sys', name: 'OpenAI Sys',
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'You are a game master', _meta: { visibility: 'llm_only' } }] }]
    };
    await configureApp(card, 'openai');
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('hello');
    await expect.poll(() => requests.length).toBe(1);
    const msg = requests[0].messages;
    expect(msg).toHaveLength(2);
    expect(msg[0]).toEqual({ role: 'system', content: 'You are a game master' });
    expect(msg[1]).toEqual({ role: 'user', content: 'hello' });
  });

  test('Anthropic extracts system messages to top-level system field', async () => {
    const card = {
      version: '1.0', id: 'ant_sys', name: 'Anthropic Sys',
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'You are a game master', _meta: { visibility: 'llm_only' } }] }]
    };
    await configureApp(card, 'anthropic');
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: anthropicStream('ok') });
    });
    await send('hello');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].system).toBe('You are a game master');
    expect(requests[0].messages).toEqual([{ role: 'user', content: 'hello' }]);
    expect(requests[0].messages.some(m => m.role === 'system')).toBe(false);
  });

  test('Anthropic joins multiple system messages with double newline', async () => {
    const card = {
      version: '1.0', id: 'ant_multi', name: 'Multi Sys',
      rules: [{ when: { phase: 'pre_send' }, then: [
        { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'rule one', _meta: { visibility: 'llm_only' } },
        { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'rule two', _meta: { visibility: 'llm_only' } }
      ]}]
    };
    await configureApp(card, 'anthropic');
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: anthropicStream('ok') });
    });
    await send('hello');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].system).toBe('rule two\n\nrule one');
  });

  test('debug_only messages excluded from both protocols', async () => {
    const card = {
      version: '1.0', id: 'dbg', name: 'Debug',
      rules: [{ when: { phase: 'pre_send' }, then: [
        { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'visible rule', _meta: { visibility: 'llm_only' } },
        { type: 'insert', predicate: { index: 'last' }, anchor: 'after', role: 'system', content: 'debug trace', _meta: { visibility: 'debug_only' } }
      ]}]
    };
    await configureApp(card, 'openai');
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('hello');
    const msg = requests[0].messages;
    expect(msg.some(m => m.content === 'debug trace')).toBe(false);
    expect(msg.some(m => m.content === 'visible rule')).toBe(true);
  });
});
