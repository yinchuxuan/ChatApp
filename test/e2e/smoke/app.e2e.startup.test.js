/**
 * E2E Tests - Electron Application Startup
 * Tests application startup and initial UI state
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('../electronAppHelper');

let appHelper;

test.beforeAll(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
}, { timeout: 30000 });

test.afterAll(async () => {
  await appHelper.close();
});

test.describe('Application Startup', () => {
  test('should launch and display main window', async () => {
    const appContainer = await appHelper.waitForSelector('.app-container');
    expect(appContainer).toBeTruthy();
  });

  test('should display Chat panel', async () => {
    const chatPanel = await appHelper.waitForSelector('.chat-panel');
    expect(chatPanel).toBeTruthy();

    const chatHeaderText = await appHelper.textContent('.chat-header .game-card-title-name');
    expect(chatHeaderText).toContain('未加载游戏卡');
  });
});
