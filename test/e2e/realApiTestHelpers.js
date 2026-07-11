/**
 * Shared helpers for E2E tests using real API keys.
 *
 * Uses E2E_OPENAI_URL, E2E_OPENAI_KEY, E2E_OPENAI_MODEL and
 * E2E_ANTHROPIC_URL, E2E_ANTHROPIC_KEY, E2E_ANTHROPIC_MODEL from .env
 */
const { ElectronAppHelper } = require('./electronAppHelper');
const { revealChatInput } = require('./chatHeaderActions');
const { expect, test } = require('@playwright/test');

function buildConfig(prefix, protocol) {
  const url = process.env[prefix + '_URL'];
  const key = process.env[prefix + '_KEY'];
  const model = process.env[prefix + '_MODEL'];
  if (!url || !key || !model) return null;
  return { apiUrl: url, apiKey: key, modelName: model, protocol };
}

const OPENAI_CONFIG = buildConfig('E2E_OPENAI', 'openai');
const ANTHROPIC_CONFIG = buildConfig('E2E_ANTHROPIC', 'anthropic');

function skipReason(prefix) {
  const missing = [];
  if (!process.env[prefix + '_URL']) missing.push(prefix + '_URL');
  if (!process.env[prefix + '_KEY']) missing.push(prefix + '_KEY');
  if (!process.env[prefix + '_MODEL']) missing.push(prefix + '_MODEL');
  return missing.join(', ') + ' not set';
}

function setupHooks() {
  let appHelper;

  test.beforeEach(async () => {
    appHelper = new ElectronAppHelper();
    await appHelper.launch();
  });

  test.afterEach(async () => {
    await appHelper.close();
  });

  return {
    getAppHelper: () => appHelper,
    async configureAppRealAPI(card, protocol = 'openai') {
      const config = protocol === 'anthropic' ? ANTHROPIC_CONFIG : OPENAI_CONFIG;
      await appHelper.saveModelConfig({
        apiUrl: config.apiUrl, apiKey: config.apiKey,
        modelName: config.modelName, protocol
      });
      if (card) {
        await appHelper.saveGameCard(card);
        await appHelper.setActiveGameCard(card.id);
      }
      await appHelper.relaunch();
      await appHelper.getWindow().waitForSelector('.app-container', { timeout: 15000 });
    },
    async sendThroughPipeline(card, protocol, messages) {
      const win = appHelper.getWindow();
      const before = await appHelper.getChatHistory();
      const assistantCount = (before.messages || []).filter(message => message.role === 'assistant').length;
      let requestBody = null;
      const captureRequest = request => {
        if (request.method() !== 'POST' || !request.postData()) return;
        try {
          const body = JSON.parse(request.postData());
          if (Array.isArray(body.messages)) requestBody = body;
        } catch (_) { /* Ignore unrelated requests. */ }
      };
      win.on('request', captureRequest);
      try {
        const lastUser = [...messages].reverse().find(message => message.role === 'user');
        await revealChatInput(appHelper);
        await win.locator('.chat-input-textarea').fill(lastUser?.content || '');
        await win.locator('.chat-input-area button[type="submit"]').click();
        await expect.poll(async () => {
          const history = await appHelper.getChatHistory();
          return (history.messages || []).filter(message => message.role === 'assistant').length;
        }, { timeout: 180000 }).toBeGreaterThan(assistantCount);
      } finally {
        win.off('request', captureRequest);
      }
      const saved = await appHelper.getChatHistory();
      const finalMessages = saved.messages || [];
      const lastUserIndex = finalMessages.findLastIndex(message => message.role === 'user');
      const responseIndex = finalMessages.findIndex((message, index) => (
        index > lastUserIndex && message.role === 'assistant'
      ));
      const assistant = finalMessages[responseIndex] || {};
      const hasAfterResponse = card?.rules?.some(rule => rule?.when?.phase === 'after_response');
      return {
        preSendMessages: finalMessages.slice(0, responseIndex),
        apiMessages: requestBody?.messages || [],
        llmResponse: assistant.content || '',
        afterResponseMessages: hasAfterResponse ? finalMessages : null,
        applied: hasAfterResponse
      };
    },
    async getHistory() {
      const result = await appHelper.getChatHistory();
      return result.success ? result.messages : [];
    },
  };
}

module.exports = { OPENAI_CONFIG, ANTHROPIC_CONFIG, skipReason, setupHooks };
