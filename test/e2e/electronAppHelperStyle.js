/**
 * Electron App Helper - Style and Element Functions
 */

class ElectronAppHelperStyle {
  constructor(window) {
    this.window = window;
  }

  async getElementBoundingBox(selector) {
    const element = await this.window.waitForSelector(selector, { timeout: 3000 });
    return await element.boundingBox();
  }

  async hasHorizontalOverflow(selector) {
    return await this.window.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      return {
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        hasOverflow: element.scrollWidth > element.clientWidth
      };
    }, selector);
  }

  async getComputedStyle(selector) {
    return await this.window.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const styles = window.getComputedStyle(element);
      return {
        width: styles.width,
        maxWidth: styles.maxWidth,
        overflowX: styles.overflowX,
        boxSizing: styles.boxSizing,
        padding: styles.padding
      };
    }, selector);
  }
}

module.exports = { ElectronAppHelperStyle };