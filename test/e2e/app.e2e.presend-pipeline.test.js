/**
 * E2E Tests: Pre-send pipeline with mocked API
 */
const { test, expect } = require('@playwright/test');
const { setupHooks } = require('./mockApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureApp, send, openAiStream, getAppHelper } = setupHooks();

test.describe('Pre-send pipeline', () => {
  test('when.length=1 triggers only on first message', async () => {
    const card = {
      version: '1.0', id: 'first', name: 'First Only',
      rules: [{ when: { phase: 'pre_send', length: 1 }, then: [{ type: 'replace', predicate: { index: 'last' }, content: '{{raw_string:FIRST: }} + {{original_content}}' }] }]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('reply one') });
    });
    await send('first msg');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages[0].content).toBe('FIRST: first msg');

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('reply two') });
    });
    await send('second msg');
    await expect.poll(() => requests.length).toBe(2);
    const lastUserMsg = requests[1].messages.filter(m => m.role === 'user').pop();
    expect(lastUserMsg.content.startsWith('FIRST:')).toBe(false);
  });

  test('when.length lte fires for messages <= threshold', async () => {
    const card = {
      version: '1.0', id: 'lte', name: 'LTE',
      rules: [{ when: { phase: 'pre_send', length: { lte: 2 } }, then: [{ type: 'insert', predicate: { index: 'last' }, anchor: 'after', role: 'system', content: 'early hint', ttl: 1, _meta: { visibility: 'llm_only' } }] }]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('hello');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages.some(m => m.content === 'early hint')).toBe(true);
  });

  test('when.any content matching fires rule', async () => {
    const card = {
      version: '1.0', id: 'any', name: 'Any Match',
      rules: [{ when: { phase: 'pre_send', any: { content: { contains: 'quest' } } }, then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'quest mode active', _meta: { visibility: 'llm_only' } }] }]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('start quest');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages[0].content).toBe('quest mode active');
  });

  test('when.all requires ALL messages to match', async () => {
    const card = {
      version: '1.0', id: 'all', name: 'All Match',
      rules: [
        { when: { phase: 'pre_send', all: { role: 'user' } }, then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'all users', _meta: { visibility: 'llm_only' } }] },
        { when: { phase: 'pre_send', all: { role: 'assistant' } }, then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'all assistants', _meta: { visibility: 'llm_only' } }] }
      ]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('hello');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages[0].content).toBe('all users');
  });

  test('pre_send compose: insert system then replace user', async () => {
    const card = {
      version: '1.0', id: 'compose', name: 'Compose',
      rules: [{ when: { phase: 'pre_send' }, then: [
        { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'SYS', _meta: { visibility: 'llm_only' } },
        { type: 'replace', predicate: { index: 'last' }, content: '{{raw_string:[P] }} + {{original_content}}' }
      ]}]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('hello');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages).toEqual([
      { role: 'system', content: 'SYS' },
      { role: 'user', content: '[P] hello' }
    ]);
  });
});
