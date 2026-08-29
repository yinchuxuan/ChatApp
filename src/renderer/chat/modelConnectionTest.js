import { sendChatRequest } from './apiClient.js';

const TEST_MAX_TOKENS = '8';
const TEST_TIMEOUT_MS = 30000;
const REQUIRED_FIELDS = [
  ['apiUrl', '模型 URL'],
  ['apiKey', 'API Key'],
  ['modelName', '模型名称']
];

function validateConnectionConfig(config) {
  const missing = REQUIRED_FIELDS
    .filter(([field]) => !String(config?.[field] || '').trim())
    .map(([, label]) => label);
  if (missing.length) throw new Error(`请先填写${missing.join('、')}`);
}

async function testModelConnection(config) {
  validateConnectionConfig(config);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
  try {
    await sendChatRequest({
      ...config,
      maxTokens: TEST_MAX_TOKENS,
      messages: [{ role: 'user', content: 'Hi' }],
      signal: controller.signal
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('连接测试超时，请检查模型 URL 或网络');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export { testModelConnection, validateConnectionConfig };
