/**
 * Shared helpers for E2E tests with mocked API responses.
 */
const { ElectronAppHelper } = require('./electronAppHelper');

function openAiStream(content) {
  const chunks = content.split(/(?=\s)/);
  let body = '';
  for (const chunk of chunks) {
    const escaped = chunk.replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
    body += `data: {"choices":[{"delta":{"content":"${escaped}"}}]}\n\n`;
  }
  body += 'data: [DONE]\n\n';
  return body;
}

function anthropicStream(content) {
  const chunks = content.split(/(?=\s)/);
  let body = '';
  body += 'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_test"}}\n\n';
  body += 'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n';
  for (const chunk of chunks) {
    const escaped = chunk.replace(/"/g, '\\"');
    body += `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"${escaped}"}}\n\n`;
  }
  body += 'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n';
  body += 'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n';
  body += 'event: message_stop\ndata: {"type":"message_stop"}\n\n';
  return body;
}

function setupHooks() {
  let appHelper;
  const { test } = require('@playwright/test');

  test.beforeEach(async () => {
    appHelper = new ElectronAppHelper();
    await appHelper.launch();
  });

  test.afterEach(async () => {
    await appHelper.close();
  });

  return {
    getAppHelper: () => appHelper,
    async configureApp(card, protocol = 'openai') {
      await appHelper.saveModelConfig({
        apiUrl: 'https://game-card.local/v1',
        apiKey: 'test-key',
        modelName: 'e2e-model',
        protocol
      });
      if (card) {
        await appHelper.saveGameCard(card);
        await appHelper.setActiveGameCard(card.id);
      }
      await appHelper.relaunch();
    },
    async send(text) {
      const { revealChatInput } = require('./chatHeaderActions');
      await revealChatInput(appHelper);
      await appHelper.window.locator('.chat-input-textarea').fill(text);
      await appHelper.window.locator('.chat-input-area button[type="submit"]').click();
    },
    openAiStream,
    anthropicStream,
  };
}

module.exports = { openAiStream, anthropicStream, setupHooks };
