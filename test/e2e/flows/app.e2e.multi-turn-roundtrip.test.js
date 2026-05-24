/**
 * E2E Tests: Multi-turn round trip with mocked API
 */
const { test, expect } = require('@playwright/test');
const { setupHooks } = require('../mockApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureApp, send, openAiStream, anthropicStream, getAppHelper } = setupHooks();

test.describe('Multi-turn round trip', () => {
  test('two-turn conversation with active game card', async () => {
    const card = {
      version: '1.0', id: 'multi_turn', name: 'Multi Turn',
      rules: [
        { when: { phase: 'pre_send' }, then: [
          { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'Game rules apply', _meta: { visibility: 'llm_only' } },
          { type: 'replace', predicate: { role: 'user' }, content: '{{raw_string:[Player] }} + {{original_content}}' }
        ]},
        { when: { phase: 'after_response', last: { role: 'assistant' } }, then: [
          { type: 'insert', predicate: { index: 'last' }, anchor: 'after', role: 'system', content: 'round hint', ttl: 2, _meta: { visibility: 'llm_only' } }
        ]}
      ]
    };
    await configureApp(card);
    const requests = [];

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('turn 1 response') });
    });
    await send('turn 1');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages[0]).toEqual({ role: 'system', content: 'Game rules apply' });
    expect(requests[0].messages[1].content).toBe('[Player] turn 1');

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('turn 2 response') });
    });
    await send('turn 2');
    await expect.poll(() => requests.length).toBe(2);

    const turn2Msgs = requests[1].messages;
    expect(turn2Msgs.some(m => m.content === 'Game rules apply' && m.role === 'system')).toBe(true);
    expect(turn2Msgs.some(m => m.content === 'round hint')).toBe(true);

    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(5);
    const saved = (await getAppHelper().getChatHistory()).messages;
    expect(saved.find(m => m.content === 'round hint').ttl).toBe(1);
  });

  test('Anthropic multi-turn with system extraction', async () => {
    const card = {
      version: '1.0', id: 'ant_multi_turn', name: 'Anthropic Multi',
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'SYS', _meta: { visibility: 'llm_only' } }] }]
    };
    await configureApp(card, 'anthropic');
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: anthropicStream('reply') });
    });
    await send('hello');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].system).toBe('SYS');
    expect(requests[0].messages.every(m => m.role !== 'system')).toBe(true);
    expect(requests[0].model).toBe('e2e-model');
    expect(requests[0].max_tokens).toBe(4096);
  });

  test('game card deactivated mid-session', async () => {
    const card = {
      version: '1.0', id: 'deact', name: 'Deactivate',
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'replace', predicate: { role: 'user' }, content: '{{raw_string:MOD: }} + {{original_content}}' }] }]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('with card');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages[0].content).toBe('MOD: with card');

    await getAppHelper().setActiveGameCard(null);
    await getAppHelper().relaunch();

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('without card');
    await expect.poll(() => requests.length).toBe(2);
    const lastUserMsg = requests[1].messages.filter(m => m.role === 'user').pop();
    expect(lastUserMsg.content).toBe('without card');
  });

  test('TTL messages expire after specified turns', async () => {
    const card = {
      version: '1.0', id: 'ttl_expire', name: 'TTL Expire',
      rules: [{ when: { phase: 'after_response', last: { role: 'assistant' }, length: 2 }, then: [{ type: 'insert', predicate: { index: 'last' }, anchor: 'after', role: 'system', content: 'temp', ttl: 3, _meta: { visibility: 'llm_only' } }] }]
    };
    await configureApp(card);

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('t1');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(3);
    let saved = (await getAppHelper().getChatHistory()).messages;
    expect(saved.find(m => m.content === 'temp').ttl).toBe(3);

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('t2');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(4);
    saved = (await getAppHelper().getChatHistory()).messages;
    expect(saved.find(m => m.content === 'temp').ttl).toBe(2);

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('t3');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(5);
    saved = (await getAppHelper().getChatHistory()).messages;
    expect(saved.find(m => m.content === 'temp').ttl).toBe(1);

    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('t4');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(6);
    saved = (await getAppHelper().getChatHistory()).messages;
    expect(saved.find(m => m.content === 'temp')).toBeUndefined();
  });

  test('exec state persists across turns', async () => {
    const card = {
      version: '1.0', id: 'state_persist', name: 'State Persist',
      state: { score: 0 },
      rules: [
        { when: { phase: 'pre_send', any: { content: { contains: 'score' } } }, then: [{ type: 'exec', source: 'state.score += 10; messages.push({ role: "system", content: "score: " + state.score, ttl: 1, _meta: { visibility: "llm_only" } }); return { messages, state };' }] },
        { when: { phase: 'after_response', last: { role: 'assistant' } }, then: [{ type: 'exec', source: 'state.score += 5; return { messages, state };' }] }
      ]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('score check');
    await expect.poll(() => requests.length).toBe(1);

    const stateResult = await getAppHelper().evaluate(({ card }) => {
      return window.applyGameCard({ card, phase: 'pre_send', messages: [{ role: 'user', content: 'score' }], state: { score: 0 } });
    }, { card });
    expect(stateResult.state.score).toBe(10);
  });
});
