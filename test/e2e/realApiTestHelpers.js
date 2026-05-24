/**
 * Shared helpers for E2E tests using real API keys.
 *
 * Uses E2E_OPENAI_URL, E2E_OPENAI_KEY, E2E_OPENAI_MODEL and
 * E2E_ANTHROPIC_URL, E2E_ANTHROPIC_KEY, E2E_ANTHROPIC_MODEL from .env
 */
const { ElectronAppHelper } = require('./electronAppHelper');

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
      const result = await win.evaluate(async ({ card, protocol, inputMsgs }) => {
        const config = (await window.electronAPI.getModelConfig()).config;
        const preSend = await window.preparePreSendMessages({ messages: inputMsgs, card, protocol: protocol || config.protocol });
        const apiMessages = window.toGameCardApiMessages(preSend.messages, protocol || config.protocol);
        let textResponse = '';
        try {
          await window.sendChatRequest({
            apiUrl: config.apiUrl, apiKey: config.apiKey,
            modelName: config.modelName, protocol: protocol || config.protocol,
            messages: apiMessages
          }, { onToken: (text) => { textResponse += text; } });
        } catch (err) {
          return { error: err.message, preSendMessages: preSend.messages, apiMessages };
        }
        const assistantMessage = { role: 'assistant', content: textResponse };
        const afterResponse = await window.prepareAfterResponseMessages({
          messages: [...preSend.messages, assistantMessage], card: preSend.card || null
        });
        const finalMessages = afterResponse.applied ? afterResponse.messages : [...preSend.messages, assistantMessage];
        await window.electronAPI.saveChatHistory(finalMessages);
        return {
          preSendMessages: preSend.messages, apiMessages,
          llmResponse: textResponse,
          afterResponseMessages: afterResponse.applied ? afterResponse.messages : null,
          applied: afterResponse.applied
        };
      }, { card, protocol, inputMsgs: messages });
      if (result.error) {
        console.log('sendThroughPipeline ERROR:', result.error);
      }
      return result;
    },
    async getHistory() {
      const result = await appHelper.getChatHistory();
      return result.success ? result.messages : [];
    },
  };
}

module.exports = { OPENAI_CONFIG, ANTHROPIC_CONFIG, skipReason, setupHooks };
