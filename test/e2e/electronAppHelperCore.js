/**
 * Electron App Helper - Core Functions
 */

const { _electron: electron } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

class ElectronAppHelperCore {
  constructor() {
    this.app = null;
    this.window = null;
    this.userDataDir = null;
  }

  async launch() {
    const appPath = path.join(__dirname, '../../main.js');

    // Create a persistent userDataDir on first launch to preserve data across relaunches
    if (!this.userDataDir) {
      this.userDataDir = path.join(__dirname, `../../test-results/.e2e-user-data-${process.env.PLAYWRIGHT_WORKER_INDEX || '0'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
      if (!fs.existsSync(this.userDataDir)) {
        fs.mkdirSync(this.userDataDir, { recursive: true });
      }
    }

    const launchArgs = [appPath];

    this.app = await electron.launch({
      args: launchArgs,
      env: this.userDataDir ? { ...process.env, E2E_USER_DATA_DIR: this.userDataDir } : undefined
    });

    this.window = await this.app.firstWindow();
    this.window.on('console', msg => console.log('Browser console:', msg.text()));

    await this.window.waitForLoadState('domcontentloaded');

    await this.window.waitForSelector('.app-container', { timeout: 15000 });

    return { app: this.app, window: this.window };
  }

  async relaunch() {
    await this.close();
    return await this.launch();
  }

  async close() {
    if (this.app) {
      await this.app.close();
      this.app = null;
      this.window = null;
    }
  }

  getWindow() { return this.window; }
  getApp() { return this.app; }
  async click(selector) { await this.window.click(selector); }
  async fill(selector, value) { await this.window.fill(selector, value); }
  async textContent(selector) { return await this.window.textContent(selector); }
  async waitForSelector(selector, options = {}) { return await this.window.waitForSelector(selector, options); }
  async hover(selector) { await this.window.hover(selector); }
  async waitForTimeout(ms) { await this.window.waitForTimeout(ms); }
  async count(selector) { return await this.window.locator(selector).count(); }

  async isVisible(selector) {
    try {
      const element = await this.window.waitForSelector(selector, { timeout: 3000 });
      return await element.isVisible();
    } catch { return false; }
  }

  async evaluate(fn, arg) { return await this.window.evaluate(fn, arg); }
  async resizeWindow(width, height) { await this.window.setViewportSize({ width, height }); }
  async getWindowSize() { return await this.window.viewportSize(); }
  async screenshot(filepath) { await this.window.screenshot({ path: filepath }); }
}

module.exports = { ElectronAppHelperCore };
