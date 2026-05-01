/**
 * E2E Tests - Settings Panel
 * Tests settings panel interactions
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('./electronAppHelper');

let appHelper;

test.beforeAll(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
}, { timeout: 30000 });

test.afterAll(async () => {
  await appHelper.close();
});

test.describe('Settings Panel', () => {
  test('should have settings trigger zone', async () => {
    const triggerZone = await appHelper.waitForSelector('.settings-trigger-zone');
    expect(triggerZone).toBeTruthy();
  });

  test('should display settings panel with visible class after hover', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(300);

    const settingsPanel = await appHelper.waitForSelector('.settings-panel');
    expect(settingsPanel).toBeTruthy();
  });

  test('should display settings header with correct title', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(200);

    const settingsTitle = await appHelper.textContent('.settings-header .settings-title');
    expect(settingsTitle).toContain('系统配置');
  });

  test('should show clickable config card in settings', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(200);

    const configCard = await appHelper.waitForSelector('.config-summary-card.background-clickable-card, .config-empty-state.background-clickable-empty');
    expect(configCard).toBeTruthy();
  });

  test('should enter edit mode when clicking config card', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(200);

    const hasEmptyState = await appHelper.isVisible('.config-empty-state.background-clickable-empty');
    const hasConfiguredCard = await appHelper.isVisible('.config-summary-card.background-clickable-card');

    if (hasEmptyState) {
      await appHelper.click('.config-empty-state.background-clickable-empty');
    } else if (hasConfiguredCard) {
      await appHelper.click('.config-summary-card.background-clickable-card');
    }

    await appHelper.waitForTimeout(200);

    const apiUrlInput = await appHelper.waitForSelector('.settings-field .settings-input');
    expect(apiUrlInput).toBeTruthy();

    const inputCount = await appHelper.count('.settings-field .settings-input');
    expect(inputCount).toBe(4);

    const cancelBtn = await appHelper.waitForSelector('.settings-actions .md-btn-primary');
    expect(cancelBtn).toBeTruthy();

    const saveBtn = await appHelper.waitForSelector('.settings-actions .md-btn-contained');
    expect(saveBtn).toBeTruthy();
  });

  test('should save model configuration via IPC', async () => {
    const testConfig = {
      apiUrl: 'https://e2e-test.example.com/v1',
      apiKey: 'e2e-test-key-12345',
      modelName: 'e2e-test-model'
    };

    const saveResult = await appHelper.saveModelConfig(testConfig);
    expect(saveResult).toBeTruthy();
    expect(saveResult.success).toBe(true);

    const configResult = await appHelper.getModelConfig();
    expect(configResult).toBeTruthy();
    expect(configResult.success).toBe(true);
    expect(configResult.config.apiUrl).toBe(testConfig.apiUrl);
    expect(configResult.config.apiKey).toBe(testConfig.apiKey);
    expect(configResult.config.modelName).toBe(testConfig.modelName);
  });
});