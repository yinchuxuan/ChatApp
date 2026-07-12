/* global browser, $, before */

const fs = require('node:fs');
const path = require('node:path');
const { activateCard, refreshApp, saveHistory } = require('./support/tauri');

const cardDir = path.resolve('game-card-examples/white-album-2');
const card = {
  version: '1.0',
  id: 'white-album-2',
  name: 'WA2 UI E2E',
  display: { stylesheet: 'display.css' },
  ui: { stylesheet: 'ui.css' },
  visual: { background: { test: 'images/scene.jpg' } },
  rules: []
};
const files = {
  'display.css': fs.readFileSync(path.join(cardDir, 'display.css'), 'utf8'),
  'images/scene.jpg': fs.readFileSync(path.resolve('test/fixtures/lisa1.jpg')),
  'ui.css': fs.readFileSync(path.join(cardDir, 'ui.css'), 'utf8')
};

async function computedTextColors(theme) {
  await browser.execute(value => localStorage.setItem('theme', value), theme);
  await refreshApp();
  await $('.game-card-theme-white-album-2').waitForExist();
  await $('.app-container.has-background-image').waitForExist();
  await $('.quoted-text').waitForExist();
  await browser.waitUntil(async () => browser.execute(() => (
    document.getElementById('game-card-ui-style')?.dataset.gameCardId === 'white-album-2'
  )));
  return browser.execute(() => {
    const bubble = document.querySelector('[data-role="user"] [data-gc-part="message-bubble"]');
    const quote = bubble.querySelector('.quoted-text');
    const bubbleStyle = getComputedStyle(bubble);
    return {
      background: bubbleStyle.backgroundImage,
      quote: getComputedStyle(quote).color,
      text: bubbleStyle.color,
      theme: document.documentElement.dataset.theme
    };
  });
}

describe('WA2 text colors', () => {
  before(async () => {
    await activateCard(card, files);
    await saveHistory([
      { role: 'user', content: '用户说：“深色高亮正文”' },
      { role: 'assistant', content: '助手说：“深色高亮正文”' }
    ], { gameState: { visual: { background: 'test' } } });
  });

  it('keeps user bubbles dark and quoted highlights dark across themes', async () => {
    for (const theme of ['light', 'dark']) {
      const styles = await computedTextColors(theme);
      expect(styles.theme).toBe(theme);
      expect(styles.background).toContain('62, 84, 105');
      expect(styles.background).toContain('31, 48, 66');
      expect(styles.text).toBe('rgb(245, 251, 255)');
      expect(styles.quote).toBe('rgb(31, 79, 115)');
    }
  });
});
