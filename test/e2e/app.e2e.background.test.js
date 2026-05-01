/**
 * E2E Tests - Background Settings
 * Tests background image configuration and UI
 */

const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('./electronAppHelper');
const path = require('path');

let appHelper;
const REAL_IMAGE_PATH = path.join(__dirname, '../fixtures/lisa1.jpg');

test.beforeAll(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
}, { timeout: 30000 });

test.afterAll(async () => {
  await appHelper.close();
});

test.describe('Background Settings UI', () => {
  test('should have background settings section in settings panel', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(200);

    const bgSection = await appHelper.waitForSelector('.background-settings-section');
    expect(bgSection).toBeTruthy();
  });

  test('should display background settings header', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(200);

    const bgHeader = await appHelper.waitForSelector('.background-settings-header');
    expect(bgHeader).toBeTruthy();

    const bgLabel = await appHelper.textContent('.background-label');
    expect(bgLabel).toContain('背景图片');
  });

  test('should show clickable background card or empty state', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(200);

    const bgCard = await appHelper.waitForSelector('.config-summary-card, .config-empty-state');
    expect(bgCard).toBeTruthy();
  });
});

test.describe('Background Settings IPC', () => {
  test('should save background configuration via IPC with local:// URL', async () => {
    const imageResult = await appHelper.readBackgroundImage(REAL_IMAGE_PATH);
    expect(imageResult.success).toBe(true);
    expect(imageResult.localUrl).toContain('local://');

    const testBgConfig = {
      backgroundImageUrl: imageResult.localUrl,
      backgroundOpacity: 0.7
    };

    const saveResult = await appHelper.saveBackgroundConfig(testBgConfig);
    expect(saveResult).toBeTruthy();
    expect(saveResult.success).toBe(true);

    const bgConfigResult = await appHelper.getBackgroundConfig();
    expect(bgConfigResult).toBeTruthy();
    expect(bgConfigResult.success).toBe(true);
    expect(bgConfigResult.config.backgroundImageUrl).toBe(imageResult.localUrl);
    expect(bgConfigResult.config.backgroundOpacity).toBe(testBgConfig.backgroundOpacity);
  });
});

test.describe('Background Image Class Toggle', () => {
  test('should apply has-background-image class when background is set via IPC', async () => {
    await appHelper.saveBackgroundConfig({
      backgroundImageUrl: '',
      backgroundOpacity: 0.5
    });
    await appHelper.waitForTimeout(300);

    const imageResult = await appHelper.readBackgroundImage(REAL_IMAGE_PATH);
    expect(imageResult.success).toBe(true);
    const testBgUrl = imageResult.localUrl;

    const saveResult = await appHelper.saveBackgroundConfig({
      backgroundImageUrl: testBgUrl,
      backgroundOpacity: 0.5
    });
    expect(saveResult.success).toBe(true);
    await appHelper.waitForTimeout(500);

    const hasClassAfter = await appHelper.evaluate(() => {
      const appContainer = document.querySelector('.app-container');
      return appContainer ? appContainer.classList.contains('has-background-image') : false;
    });
    expect(hasClassAfter).toBe(true);

    const hasBackgroundStyle = await appHelper.evaluate(() => {
      const appContainer = document.querySelector('.app-container');
      return appContainer && appContainer.style.backgroundImage.includes('url');
    });
    expect(hasBackgroundStyle).toBe(true);
  });

  test('should remove has-background-image class when background is cleared via IPC', async () => {
    // First set a background
    const imageResult = await appHelper.readBackgroundImage(REAL_IMAGE_PATH);
    const testBgUrl = imageResult.localUrl;

    await appHelper.saveBackgroundConfig({
      backgroundImageUrl: testBgUrl,
      backgroundOpacity: 0.5
    });
    await appHelper.waitForTimeout(500);

    const hasClassBeforeClear = await appHelper.evaluate(() => {
      const appContainer = document.querySelector('.app-container');
      return appContainer ? appContainer.classList.contains('has-background-image') : false;
    });
    expect(hasClassBeforeClear).toBe(true);

    // Now clear the background
    await appHelper.saveBackgroundConfig({
      backgroundImageUrl: '',
      backgroundOpacity: 0.5
    });
    await appHelper.waitForTimeout(500);

    const hasClassAfter = await appHelper.evaluate(() => {
      const appContainer = document.querySelector('.app-container');
      return appContainer ? appContainer.classList.contains('has-background-image') : false;
    });
    expect(hasClassAfter).toBe(false);
  });
});

test.describe('Background Config Persistence', () => {
  test('should persist background configuration across sessions with local:// URL', async () => {
    const imageResult = await appHelper.readBackgroundImage(REAL_IMAGE_PATH);
    expect(imageResult.success).toBe(true);

    const persistConfig = {
      backgroundImageUrl: imageResult.localUrl,
      backgroundOpacity: 0.8
    };

    const saveResult = await appHelper.saveBackgroundConfig(persistConfig);
    expect(saveResult.success).toBe(true);

    // Actually close and reopen the app to test cross-session persistence
    await appHelper.relaunch();

    const retrievedConfig = await appHelper.getBackgroundConfig();
    expect(retrievedConfig.success).toBe(true);
    expect(retrievedConfig.config.backgroundImageUrl).toBe(imageResult.localUrl);
    expect(retrievedConfig.config.backgroundOpacity).toBe(persistConfig.backgroundOpacity);
  });
});
