/* global browser, $, before */

const fs = require('node:fs');
const path = require('node:path');
const { activateCard, refreshApp, saveHistory } = require('./support/tauri');

const cardDir = path.resolve('game-card-examples/white-album-2');
const card = {
  version: '1.0',
  id: 'white-album-2',
  name: 'WA2 Retry E2E',
  display: JSON.parse(fs.readFileSync(path.join(cardDir, 'display.json'), 'utf8')),
  ui: {
    stylesheet: 'ui.css',
    root: { type: 'react', source: 'ui/root.js', style: 'ui/root.css' }
  },
  visual: {
    background: { test: 'images/scene.png' },
    portrait: { test: { normal: 'images/portrait.png' } }
  },
  rules: []
};
const files = {
  'display.css': fs.readFileSync(path.join(cardDir, 'display.css'), 'utf8'),
  'images/portrait.png': fs.readFileSync(path.join(cardDir, 'images/touma/normal.png')),
  'images/scene.png': fs.readFileSync(path.join(cardDir, 'images/background/common/school.png')),
  'ui.css': fs.readFileSync(path.join(cardDir, 'ui.css'), 'utf8'),
  'ui/root.css': fs.readFileSync(path.join(cardDir, 'ui/root.css'), 'utf8'),
  'ui/root.js': fs.readFileSync(path.join(cardDir, 'ui/root.js'), 'utf8')
};

describe('WA2 retry page', () => {
  before(async () => {
    await activateCard(card, files);
    await saveHistory([
      { role: 'user', content: '去第三音乐室继续练习。' },
      { role: 'assistant', content: '冬马坐在钢琴前，没有回头。' }
    ], { gameState: { visual: { scene: 'test', portraits: { test: 'normal' } } } });
    await refreshApp();
    await $('.wa2-ui-root').waitForExist();
  });

  it('opens with right click and closes with Escape without persistent controls', async () => {
    await browser.execute(() => {
      document.querySelector('[data-gc-part="chat-panel"]').dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
      );
    });
    await $('.wa2-retry-layer').waitForExist();
    await browser.pause(350);
    await browser.saveScreenshot(path.resolve('test-results/tauri-e2e/wa2-retry-page.png'));

    const view = await browser.execute(() => {
      const layer = document.querySelector('.wa2-retry-layer');
      const rect = layer.getBoundingClientRect();
      const editor = document.querySelector('.wa2-retry-editor');
      return {
        background: getComputedStyle(layer).backgroundColor,
        editor: editor.value,
        height: rect.height,
        panelOpacity: getComputedStyle(document.querySelector('.wa2-retry-panel')).opacity,
        topmost: document.elementFromPoint(innerWidth / 2, innerHeight / 2)
          ?.closest('.wa2-retry-layer') === layer,
        trigger: document.querySelector('.wa2-pause-trigger'),
        width: rect.width
      };
    });

    expect(view.background).toBe('rgba(0, 0, 0, 0.82)');
    expect(view.editor).toBe('去第三音乐室继续练习。');
    expect(view.width).toBeCloseTo(await browser.execute(() => innerWidth), 0);
    expect(view.height).toBeCloseTo(await browser.execute(() => innerHeight), 0);
    expect(view.panelOpacity).toBe('1');
    expect(view.topmost).toBe(true);
    expect(view.trigger).toBeNull();

    await browser.keys(['Escape']);
    await $('.wa2-retry-layer').waitForExist({ reverse: true });
  });
});
