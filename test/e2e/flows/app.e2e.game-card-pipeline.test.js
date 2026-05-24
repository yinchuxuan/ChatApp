const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('../electronAppHelper');
const { revealChatInput } = require('../chatHeaderActions');

let appHelper;

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
});

test.afterEach(async () => {
  await appHelper.close();
});

function streamingBody(content) {
  return `data: {"choices":[{"delta":{"content":"${content}"}}]}\n\ndata: [DONE]\n\n`;
}

function pipelineCard() {
  return {
    version: '1.0',
    id: 'e2e_pipeline_card',
    name: 'Pipeline Quest',
    rules: [
      {
        when: { phase: 'pre_send' },
        then: [
          {
            type: 'insert',
            predicate: { index: 0 },
            role: 'system',
            content: 'SYSTEM RULES',
            ttl: -1,
            _meta: { source: 'game_card', visibility: 'llm_only' }
          },
          {
            type: 'replace',
            predicate: { index: 'last' },
            content: '{{raw_string:[player] }} + {{original_content}}'
          }
        ]
      },
      {
        when: { phase: 'after_response', last: { role: 'assistant' } },
        then: [
          {
            type: 'replace',
            predicate: { index: 'last' },
            content: "{{original_content}}.regex_replace{pattern:'`',with:'',flags:'g'}"
          },
          {
            type: 'insert',
            predicate: { index: 'last' },
            anchor: 'after',
            role: 'system',
            content: 'temporary hint',
            ttl: 2,
            _meta: { source: 'game_card', visibility: 'llm_only' }
          }
        ]
      }
    ]
  };
}

async function configureApp(card, protocol = 'openai') {
  await appHelper.saveModelConfig({
    apiUrl: 'https://game-card.local/v1',
    apiKey: 'test-key',
    modelName: 'e2e-model',
    protocol
  });
  await appHelper.saveGameCard(card);
  await appHelper.setActiveGameCard(card.id);
  await appHelper.relaunch();
}

async function sendMessage(text) {
  await revealChatInput(appHelper);
  await appHelper.window.locator('.chat-input-textarea').fill(text);
  await appHelper.window.locator('.chat-input-area button[type="submit"]').click();
}

test('applies pre_send and after_response rules in the real chat UI flow', async () => {
  await configureApp(pipelineCard());
  const requests = [];
  await appHelper.window.route('https://game-card.local/**', async route => {
    requests.push(JSON.parse(route.request().postData()));
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: streamingBody('```model says ok```') });
  });

  await sendMessage('hello');

  await expect(appHelper.window.locator('.chat-history')).toContainText('[player] hello');
  await expect(appHelper.window.locator('.chat-history')).toContainText('model says ok');
  await expect(appHelper.window.locator('.chat-history')).not.toContainText('SYSTEM RULES');
  await expect.poll(() => requests.length).toBe(1);

  expect(requests[0].messages).toEqual([
    { role: 'system', content: 'SYSTEM RULES' },
    { role: 'user', content: '[player] hello' }
  ]);

  await expect.poll(async () => (await appHelper.getChatHistory()).messages.length).toBe(4);
  const saved = (await appHelper.getChatHistory()).messages;
  expect(saved.map(msg => msg.content)).toEqual([
    'SYSTEM RULES',
    '[player] hello',
    'model says ok',
    'temporary hint'
  ]);
  expect(saved[3].ttl).toBe(2);
});

test('adapts active game card system messages to Anthropic top-level system', async () => {
  await configureApp(pipelineCard(), 'anthropic');
  const requests = [];
  await appHelper.window.route('https://game-card.local/**', async route => {
    requests.push(JSON.parse(route.request().postData()));
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}\n\n' });
  });

  await sendMessage('anthropic hello');

  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].system).toBe('SYSTEM RULES');
  expect(requests[0].messages).toEqual([{ role: 'user', content: '[player] anthropic hello' }]);
});
