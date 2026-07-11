/**
 * E2E Test: OpenAI and Anthropic protocol API calls
 *
 * Environment variables:
 *   Anthropic: E2E_ANTHROPIC_URL, E2E_ANTHROPIC_KEY, E2E_ANTHROPIC_MODEL
 *   OpenAI:    E2E_OPENAI_URL,    E2E_OPENAI_KEY,    E2E_OPENAI_MODEL
 */
const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getUserDataPaths } = require('../../ipc/userDataPaths');

function buildConfig(prefix, protocol) {
  const url = process.env[prefix + '_URL'];
  const key = process.env[prefix + '_KEY'];
  const model = process.env[prefix + '_MODEL'];
  if (!url || !key || !model) return null;
  return { apiUrl: url, apiKey: key, modelName: model, protocol };
}

const ANTHROPIC_CONFIG = buildConfig('E2E_ANTHROPIC', 'anthropic');
const OPENAI_CONFIG = buildConfig('E2E_OPENAI', 'openai');

test.describe.configure({ mode: 'serial' });

function skipReason(prefix) {
  const missing = [];
  if (!process.env[prefix + '_URL']) missing.push(prefix + '_URL');
  if (!process.env[prefix + '_KEY']) missing.push(prefix + '_KEY');
  if (!process.env[prefix + '_MODEL']) missing.push(prefix + '_MODEL');
  return missing.join(', ') + ' not set';
}

async function setupApp(config) {
  const userDataDir = path.join(os.tmpdir(), 'chatapp-e2e-' + Date.now());
  const configPath = getUserDataPaths(userDataDir, null).modelConfigPath;
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify(config, null, 2),
    'utf-8'
  );

  const app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'main.js')],
    env: { ...process.env, E2E_USER_DATA_DIR: userDataDir }
  });

  const win = await app.firstWindow();
  await win.waitForLoadState('domcontentloaded');
  await win.waitForTimeout(3000);
  return { app, win, userDataDir };
}

async function runSendChatRequest(win) {
  const beforeCount = await win.evaluate(async () => {
    const history = await window.electronAPI.getChatHistory();
    return (history.messages || []).filter(message => message.role === 'assistant').length;
  });
  await win.evaluate(() => {
    const trigger = document.querySelector('.chat-input-hover-trigger');
    trigger?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
  });
  await win.locator('.chat-input-area-visible .chat-input-textarea').fill('say ok');
  await win.locator('.chat-input-area button[type="submit"]').click();
  await expect.poll(() => win.evaluate(async () => {
    const history = await window.electronAPI.getChatHistory();
    return (history.messages || []).filter(message => message.role === 'assistant').length;
  }), { timeout: 120000 }).toBeGreaterThan(beforeCount);
  return win.evaluate(async () => {
    const history = await window.electronAPI.getChatHistory();
    const response = [...history.messages].reverse().find(message => message.role === 'assistant');
    return {
      error: response?.isError ? response.content : null,
      textLength: response?.content?.length || 0,
      textPreview: response?.content?.substring(0, 100) || '',
      thinkingLength: response?.thinking?.length || 0
    };
  });
}

test.describe('E2E - Anthropic protocol', () => {
  let electronApp;
  let window;
  let userDataDir;

  test.beforeAll(async () => {
    if (!ANTHROPIC_CONFIG) return;
    const setup = await setupApp(ANTHROPIC_CONFIG);
    electronApp = setup.app;
    window = setup.win;
    userDataDir = setup.userDataDir;
  }, 60000);

  test.afterAll(async () => {
    if (electronApp) await electronApp.close();
    if (userDataDir && fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  });

  test('sendChatRequest should return tokens', async () => {
    if (!ANTHROPIC_CONFIG) { test.skip(true, skipReason('E2E_ANTHROPIC')); return; }

    const result = await runSendChatRequest(window);
    console.log('Anthropic result:', JSON.stringify(result, null, 2));

    expect(result.error).toBeFalsy();
    expect(result.textLength + result.thinkingLength).toBeGreaterThan(0);
  }, 120000);
});

test.describe('E2E - OpenAI protocol', () => {
  let electronApp;
  let window;
  let userDataDir;

  test.beforeAll(async () => {
    if (!OPENAI_CONFIG) return;
    const setup = await setupApp(OPENAI_CONFIG);
    electronApp = setup.app;
    window = setup.win;
    userDataDir = setup.userDataDir;
  }, 60000);

  test.afterAll(async () => {
    if (electronApp) await electronApp.close();
    if (userDataDir && fs.existsSync(userDataDir)) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  });

  test('sendChatRequest should return tokens', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const result = await runSendChatRequest(window);
    console.log('OpenAI result:', JSON.stringify(result, null, 2));

    expect(result.error).toBeFalsy();
    expect(result.textLength).toBeGreaterThan(0);
  }, 120000);
});
