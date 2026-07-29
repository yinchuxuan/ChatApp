/* global browser, $, $$, before */

const fs = require('node:fs');
const path = require('node:path');
const { activateCard, refreshApp, saveHistory } = require('./support/tauri');

const cardDir = path.resolve('game-card-examples/white-album-2');
const display = JSON.parse(fs.readFileSync(path.join(cardDir, 'display.json'), 'utf8'));
const card = {
  version: '1.0',
  id: 'white-album-2',
  name: 'WA2 UI E2E',
  display,
  ui: { stylesheet: 'ui.css' },
  visual: {
    background: { test: 'images/scene.png' },
    portrait: { test: 'images/portrait.png' }
  },
  rules: []
};
const files = {
  'display.css': fs.readFileSync(path.join(cardDir, 'display.css'), 'utf8'),
  'images/portrait.png': fs.readFileSync(path.join(cardDir, 'images/touma/normal.png')),
  'images/scene.png': fs.readFileSync(path.join(cardDir, 'images/school.png')),
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
    const surface = document.querySelector('[data-gc-part="collapsed-message-view"]');
    const bubbleStyle = getComputedStyle(bubble);
    const surfaceStyle = getComputedStyle(surface);
    return {
      background: bubbleStyle.backgroundImage,
      quote: getComputedStyle(quote).color,
      surfaceBackground: surfaceStyle.backgroundColor,
      surfaceBorder: surfaceStyle.borderTopWidth,
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
    ], { gameState: { visual: { background: 'test', portrait: 'test' } } });
  });

  it('keeps the text white and removes the glass surface across themes', async () => {
    for (const theme of ['light', 'dark']) {
      const styles = await computedTextColors(theme);
      expect(styles.theme).toBe(theme);
      expect(styles.background).toBe('none');
      expect(styles.surfaceBackground).toBe('rgba(0, 0, 0, 0)');
      expect(styles.surfaceBorder).toBe('0px');
      expect(styles.text).toBe('rgb(255, 255, 255)');
      expect(styles.quote).toBe('rgb(255, 255, 255)');
    }
  });

  it('hides the user message and centers subtitles below the 2.4:1 frame', async () => {
    await browser.setWindowSize(1280, 720);
    await refreshApp();
    await $('.app-background-layer-current').waitForExist();
    await $('[data-gc-part="portrait-layer"]').waitForExist();
    const layout = await browser.execute(() => {
      const rect = selector => {
        const { top, right, bottom, left, width, height } = document
          .querySelector(selector).getBoundingClientRect();
        return { top, right, bottom, left, width, height };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight },
        background: rect('.app-background-layer-current'),
        portrait: rect('[data-gc-part="portrait-layer"]'),
        text: rect('[data-gc-part="chat-history"]'),
        assistant: rect('[data-role="assistant"]'),
        assistantTextAlign: getComputedStyle(
          document.querySelector('[data-role="assistant"] [data-gc-part="message-bubble"]')
        ).textAlign,
        userDisplay: getComputedStyle(document.querySelector('[data-role="user"]')).display
      };
    });
    const expectedHeight = layout.viewport.width / 2.4;
    const expectWithinPixel = (actual, expected) => (
      expect(Math.abs(actual - expected)).toBeLessThan(1)
    );
    expectWithinPixel(layout.background.width, layout.viewport.width);
    expectWithinPixel(layout.background.height, expectedHeight);
    expectWithinPixel(layout.background.top, (layout.viewport.height - expectedHeight) / 2);
    expectWithinPixel(layout.portrait.top, layout.background.top);
    expectWithinPixel(layout.portrait.height, layout.background.height);
    expectWithinPixel(layout.text.top, layout.background.top + layout.background.height);
    expectWithinPixel(layout.text.bottom, layout.viewport.height);
    expect(layout.userDisplay).toBe('none');
    expect(layout.assistantTextAlign).toBe('center');
    const assistantCenter = (layout.assistant.top + layout.assistant.bottom) / 2;
    const lowerBarCenter = (layout.text.top + layout.text.bottom) / 2;
    expect(assistantCenter).toBeCloseTo(lowerBarCenter, 0);
  });

  it('shows the choices on a fullscreen text overlay after the narrative pages', async () => {
    await browser.setWindowSize(1200, 801);
    await saveHistory([{
      role: 'assistant',
      content: [
        '第一段剧情。',
        '',
        '第二段剧情。',
        '',
        'A. 选择一。',
        '',
        'B. 选择二。',
        '',
        'C. 选择三。',
        '',
        'D. 选择四。'
      ].join('\n')
    }], { gameState: { visual: { background: 'test', portrait: 'test' } } });
    await refreshApp();
    await $('.segmented-reading-bubble').waitForExist();
    await $('.app-background-layer-current').waitForExist();
    await $('[data-gc-part="portrait-layer"]').waitForExist();
    const input = await $('[data-gc-part="chat-input"]');
    expect(await input.getCSSProperty('display')).toHaveProperty('value', 'none');
    const surface = await $('[data-gc-part="chat-panel"]');
    await surface.click();
    expect(await input.getCSSProperty('display')).toHaveProperty('value', 'none');
    await browser.pause(350);
    await surface.click();
    await $('.wa2-choice-overlay').waitForExist();
    await browser.waitUntil(async () => (await $$('.wa2-choice')).length === 4);
    await browser.pause(2200);
    await browser.saveScreenshot(path.resolve('test-results/tauri-e2e/wa2-choice-overlay.png'));
    const menu = await browser.execute(() => {
      const overlay = document.querySelector('.segmented-reading-page:has(.wa2-choice-overlay)');
      const choice = document.querySelector('.wa2-choice');
      const rect = overlay.getBoundingClientRect();
      const menuRect = document.querySelector('.wa2-choice-overlay').getBoundingClientRect();
      const overlayStyle = getComputedStyle(overlay);
      const choiceStyle = getComputedStyle(choice);
      const choiceRect = choice.getBoundingClientRect();
      return {
        background: getComputedStyle(document.querySelector('.app-container'), '::after').backgroundColor,
        paint: { animation: overlayStyle.animationName, opacity: overlayStyle.opacity, transform: overlayStyle.transform, visibility: overlayStyle.visibility, z: overlayStyle.zIndex },
        controlZ: ['chat-header-trigger', 'chat-input-trigger'].map(part => Number(
          getComputedStyle(document.querySelector(`[data-gc-part="${part}"]`)).zIndex)),
        historyOverflow: getComputedStyle(document.querySelector('[data-gc-part="chat-history"]')).overflow,
        backgroundZ: getComputedStyle(document.querySelector('.app-background-layer-current')).zIndex,
        alignment: { centerX: menuRect.left + menuRect.width / 2, centerY: menuRect.top + menuRect.height / 2, left: [menuRect.left, choiceRect.left], width: menuRect.width },
        border: choiceStyle.borderTopWidth,
        choiceBackground: choiceStyle.backgroundColor,
        choiceIsTopmost: document.elementFromPoint(
          choiceRect.left + choiceRect.width / 2,
          choiceRect.top + choiceRect.height / 2
        )?.closest('.wa2-choice') === choice,
        contentZ: getComputedStyle(document.querySelector('.app-content-wrapper')).zIndex,
        height: rect.height,
        portraitZ: getComputedStyle(document.querySelector('[data-gc-part="portrait-layer"]')).zIndex,
        prompt: document.querySelector('.wa2-choice-prompt').textContent,
        top: rect.top,
        viewport: { height: innerHeight, width: innerWidth },
        width: rect.width
      };
    });
    expect(menu.top).toBeCloseTo(0, 0);
    expect(menu.width).toBe(menu.viewport.width);
    expect(menu.height).toBe(menu.viewport.height);
    expect(menu.background).toBe('rgba(0, 0, 0, 0.72)');
    expect(menu.paint).toMatchObject({ animation: 'none', opacity: '1', visibility: 'visible' });
    expect(menu.paint.transform).not.toBe('none');
    expect(menu.controlZ.every(z => z > Number(menu.paint.z))).toBe(true);
    expect(menu.alignment.centerX).toBeCloseTo(menu.viewport.width / 2, 0);
    expect(menu.alignment.width).toBeCloseTo(menu.viewport.width / 2, 0);
    expect(menu.alignment.centerY).toBeCloseTo(menu.viewport.height / 2, 0);
    expect(menu.alignment.left[0]).toBeCloseTo(menu.alignment.left[1], 0);
    expect(menu.historyOverflow).toBe('visible');
    expect(menu.choiceBackground).toBe('rgba(0, 0, 0, 0)');
    expect(menu.border).toBe('0px');
    expect(menu.choiceIsTopmost).toBe(true);
    expect(Number(menu.contentZ)).toBeGreaterThan(Number(menu.portraitZ));
    expect(Number(menu.contentZ)).toBeGreaterThan(Number(menu.backgroundZ));
    expect(menu.prompt).toBe('请选择下一步行动');
    expect(await input.getCSSProperty('display')).not.toHaveProperty('value', 'none');
    expect(await $$('.wa2-choice')).toHaveLength(4);
  });
});
