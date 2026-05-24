/**
 * E2E Tests - Settings Panel
 * Tests settings panel interactions
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('./electronAppHelper');

let appHelper;

test.describe.configure({ mode: 'serial' });

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

  test('should show config card in settings', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(200);

    const configCard = await appHelper.waitForSelector('.config-summary-card, .config-empty-state');
    expect(configCard).toBeTruthy();
  });

  test('should show inline editable fields in config card', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(200);

    // Verify field labels are present
    const hasEmptyState = await appHelper.isVisible('.config-empty-state.background-clickable-empty');

    if (!hasEmptyState) {
      // Configured: should show inline field labels
      const urlLabel = await appHelper.textContent('.settings-field-label');
      expect(urlLabel).toContain('模型 URL');

      const labelCount = await appHelper.count('.settings-field-label');
      expect(labelCount).toBeGreaterThanOrEqual(4);

      // Click a value to enter inline edit
      const firstValue = await appHelper.waitForSelector('.settings-field-value');
      expect(firstValue).toBeTruthy();
    }
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
