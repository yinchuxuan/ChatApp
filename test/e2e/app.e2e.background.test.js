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

  test('should show clickable background card', async () => {
    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(200);

    const bgCard = await appHelper.waitForSelector('.background-clickable-empty, .background-clickable-card');
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
  test('should apply has-background-image class when background is set via UI', async () => {
    await appHelper.saveBackgroundConfig({
      backgroundImageUrl: '',
      backgroundOpacity: 0.5
    });
    await appHelper.waitForTimeout(300);

    const imageResult = await appHelper.readBackgroundImage(REAL_IMAGE_PATH);
    expect(imageResult.success).toBe(true);
    const testBgUrl = imageResult.localUrl;

    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(500);

    const bgClickableElement = await appHelper.waitForSelector('.background-clickable-empty, .background-clickable-card', { timeout: 10000 });
    await bgClickableElement.click();
    await appHelper.waitForTimeout(300);

    await appHelper.fill('.background-edit-form .settings-input', testBgUrl);
    await appHelper.waitForTimeout(200);

    const saveBtn = await appHelper.waitForSelector('.background-actions .md-btn-contained', { timeout: 5000 });
    await saveBtn.click();
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

  test('should remove has-background-image class when background is cleared via UI', async () => {
    await appHelper.saveBackgroundConfig({
      backgroundImageUrl: '',
      backgroundOpacity: 0.5
    });
    await appHelper.waitForTimeout(500);

    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(500);

    const bgClickableElement = await appHelper.waitForSelector('.background-clickable-empty, .background-clickable-card', { timeout: 10000 });
    await bgClickableElement.click();
    await appHelper.waitForTimeout(300);

    const imageResult = await appHelper.readBackgroundImage(REAL_IMAGE_PATH);
    const testBgUrl = imageResult.localUrl;
    await appHelper.fill('.background-edit-form .settings-input', testBgUrl);
    await appHelper.waitForTimeout(200);

    const saveBtn1 = await appHelper.waitForSelector('.background-actions .md-btn-contained', { timeout: 5000 });
    await saveBtn1.click();
    await appHelper.waitForTimeout(500);

    const hasClassBeforeClear = await appHelper.evaluate(() => {
      const appContainer = document.querySelector('.app-container');
      return appContainer ? appContainer.classList.contains('has-background-image') : false;
    });
    expect(hasClassBeforeClear).toBe(true);

    await appHelper.hover('.settings-trigger-zone');
    await appHelper.waitForTimeout(500);

    const bgClickableCard = await appHelper.waitForSelector('.background-clickable-card');
    await bgClickableCard.click();
    await appHelper.waitForTimeout(300);

    await appHelper.evaluate(() => {
      const btns = document.querySelectorAll('.background-image-actions .md-btn-tonal');
      if (btns.length > 1) {
        btns[btns.length - 1].click();
      }
    });
    await appHelper.waitForTimeout(200);

    const saveBtn2 = await appHelper.waitForSelector('.background-actions .md-btn-contained', { timeout: 5000 });
    await saveBtn2.click();
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