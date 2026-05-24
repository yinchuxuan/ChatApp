/**
 * E2E Tests: After-response pipeline and content descriptor with mocked API
 */
const { test, expect } = require('@playwright/test');
const { setupHooks } = require('./mockApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureApp, send, openAiStream, getAppHelper } = setupHooks();

// ---------------------------------------------------------------------------
// 1. After-response pipeline
// ---------------------------------------------------------------------------

test.describe('After-response pipeline', () => {
  test('replaces assistant content to clean code fences', async () => {
    const card = {
      version: '1.0', id: 'clean', name: 'Clean',
      rules: [{
        when: { phase: 'after_response', last: { role: 'assistant' } },
        then: [{
          type: 'replace', predicate: { index: 'last' },
          content: "{{original_content}}.regex_replace{pattern:'^```\\\\w*\\\\n',with:''}.regex_replace{pattern:'\\\\n```$',with:''}"
        }]
      }]
    };
    await configureApp(card);
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('```json\n{"status":"ok"}\n```') });
    });
    await send('hello');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(2);
    const saved = (await getAppHelper().getChatHistory()).messages;
    const assistantMsg = saved.find(m => m.role === 'assistant');
    expect(assistantMsg.content).toBe('{"status":"ok"}');
  });

  test('inserts hint with TTL that decays across turns', async () => {
    const card = {
      version: '1.0', id: 'ttl_hint', name: 'TTL Hint',
      rules: [{
        when: { phase: 'after_response', last: { role: 'assistant' }, length: 2 },
        then: [{
          type: 'insert', predicate: { index: 'last' }, anchor: 'after',
          role: 'system', content: 'hint', ttl: 2, _meta: { visibility: 'llm_only' }
        }]
      }]
    };
    await configureApp(card);

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('reply1') });
    });
    await send('turn1');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(3);
    let saved = (await getAppHelper().getChatHistory()).messages;
    const hint1 = saved.find(m => m.content === 'hint');
    expect(hint1).toBeDefined();
    expect(hint1.ttl).toBe(1);

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('reply2') });
    });
    await send('turn2');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(4);
    saved = (await getAppHelper().getChatHistory()).messages;
    const hint2 = saved.find(m => m.content === 'hint');
    expect(hint2).toBeUndefined();
  });

  test('after_response only fires when last message is assistant', async () => {
    const card = {
      version: '1.0', id: 'last_check', name: 'Last Check',
      rules: [{
        when: { phase: 'after_response', last: { role: 'assistant' } },
        then: [{ type: 'replace', predicate: { index: 'last' }, content: 'cleaned' }]
      }]
    };
    await configureApp(card);
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('raw reply') });
    });
    await send('hello');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(2);
    const saved = (await getAppHelper().getChatHistory()).messages;
    const assistantMsg = saved.find(m => m.role === 'assistant');
    expect(assistantMsg.content).toBe('cleaned');
  });
});

// ---------------------------------------------------------------------------
// 2. Content descriptor
// ---------------------------------------------------------------------------

test.describe('Content descriptor', () => {
  test('raw_string prefix prepended to user messages', async () => {
    const card = {
      version: '1.0', id: 'prefix', name: 'Prefix',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'replace', predicate: { role: 'user' }, content: '{{raw_string:【玩家】}} + {{original_content}}' }]
      }]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('hello world');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages[0].content).toBe('【玩家】hello world');
  });

  test('regex_replace chain on assistant response', async () => {
    const card = {
      version: '1.0', id: 'regex_chain', name: 'Regex Chain',
      rules: [{
        when: { phase: 'after_response', last: { role: 'assistant' } },
        then: [{
          type: 'replace', predicate: { index: 'last' },
          content: "{{original_content}}.regex_replace{pattern:'^```',with:''}.regex_replace{pattern:'\\\\n```$',with:''}"
        }]
      }]
    };
    await configureApp(card);
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('```result\n```') });
    });
    await send('test');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(2);
    const saved = (await getAppHelper().getChatHistory()).messages;
    const assistantMsg = saved.find(m => m.role === 'assistant');
    expect(assistantMsg.content).toBe('result');
  });

  test('regex_extract captures JSON from code block', async () => {
    const card = {
      version: '1.0', id: 'extract', name: 'Extract',
      rules: [{
        when: { phase: 'after_response', last: { role: 'assistant' } },
        then: [{
          type: 'replace', predicate: { index: 'last' },
          content: "{{original_content}}.regex_extract{pattern:'\\\\{[^}]*\\\\}',group:0}"
        }]
      }]
    };
    await configureApp(card);
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('```json\n{"ok":true,"count":5}\n```') });
    });
    await send('get status');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(2);
    const saved = (await getAppHelper().getChatHistory()).messages;
    const assistantMsg = saved.find(m => m.role === 'assistant');
    expect(assistantMsg.content).toBe('{"ok":true,"count":5}');
  });

  test('concatenation: raw_string + original_content', async () => {
    const card = {
      version: '1.0', id: 'concat', name: 'Concat',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{
          type: 'replace', predicate: { role: 'user' },
          content: '{{raw_string:CMD: }} + {{original_content}} + {{raw_string: :END}}'
        }]
      }]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('run');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages[0].content).toBe('CMD: run :END');
  });
});
