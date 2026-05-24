const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { ElectronAppHelper } = require('./electronAppHelper');
const { revealChatInput } = require('./chatHeaderActions');

let appHelper;

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
});

test.afterEach(async () => {
  await appHelper.close();
});

function stream(text) {
  return `data: {"choices":[{"delta":{"content":"${text}"}}]}\n\ndata: [DONE]\n\n`;
}

async function activateCard(card) {
  await appHelper.saveModelConfig({
    apiUrl: 'https://game-card.local/v1',
    apiKey: 'test-key',
    modelName: 'e2e-model',
    protocol: 'openai'
  });
  await appHelper.saveGameCard(card);
  await appHelper.setActiveGameCard(card.id);
}

function writeCardFile(cardId, relativePath, content) {
  const filePath = path.join(appHelper.userDataDir, 'game-cards', 'cards', cardId, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function send(text) {
  await revealChatInput(appHelper);
  await appHelper.window.locator('.chat-input-textarea').fill(text);
  await appHelper.window.locator('.chat-input-area button[type="submit"]').click();
}

test('resolves file_content through safe IPC in the chat send pipeline', async () => {
  const card = {
    version: '1.0',
    id: 'e2e_file_card',
    name: 'File Quest',
    rules: [{
      when: { phase: 'pre_send' },
      then: [{
        type: 'insert',
        predicate: { index: 0 },
        role: 'system',
        content: '{{file_content:worldbook/rules.md}}',
        _meta: { visibility: 'llm_only' }
      }]
    }]
  };
  await activateCard(card);
  writeCardFile(card.id, 'worldbook/rules.md', 'File rules: stay in scene.');
  await appHelper.relaunch();

  const requests = [];
  await appHelper.window.route('https://game-card.local/**', async route => {
    requests.push(JSON.parse(route.request().postData()));
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: stream('ok') });
  });

  await send('start');

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].messages[0]).toEqual({ role: 'system', content: 'File rules: stay in scene.' });
  await expect(appHelper.window.locator('.chat-history')).not.toContainText('File rules');
});

test('rejects file_content traversal before sending the API request', async () => {
  const card = {
    version: '1.0',
    id: 'e2e_bad_file_card',
    name: 'Bad File Quest',
    rules: [{
      when: { phase: 'pre_send' },
      then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: '{{file_content:../secret.md}}' }]
    }]
  };
  await activateCard(card);
  await appHelper.relaunch();

  let requestCount = 0;
  await appHelper.window.route('https://game-card.local/**', async route => {
    requestCount += 1;
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: stream('bad') });
  });

  await send('start');

  await expect(appHelper.window.locator('.chat-history')).toContainText('file_content path must stay inside game card directory');
  expect(requestCount).toBe(0);
});

test('runs exec in the real chat pipeline and persists transformed messages', async () => {
  const card = {
    version: '1.0',
    id: 'e2e_exec_card',
    name: 'Exec Quest',
    rules: [
      {
        when: { phase: 'pre_send' },
        then: [{ type: 'exec', source: 'messages[messages.length - 1].content = "[exec] " + messages[messages.length - 1].content; return { messages };' }]
      },
      {
        when: { phase: 'after_response' },
        then: [{ type: 'exec', source: 'messages.push({ role: "system", content: "exec after", ttl: 2, _meta: { visibility: "llm_only" } }); return { messages };' }]
      }
    ]
  };
  await activateCard(card);
  await appHelper.relaunch();

  await appHelper.window.route('https://game-card.local/**', async route => {
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: stream('done') });
  });

  await send('move');

  await expect(appHelper.window.locator('.chat-history')).toContainText('[exec] move');
  await expect.poll(async () => (await appHelper.getChatHistory()).messages.length).toBe(3);
  const saved = (await appHelper.getChatHistory()).messages;
  expect(saved.map(msg => msg.content)).toEqual(['[exec] move', 'done', 'exec after']);
  expect(saved[2].ttl).toBe(1);
});
