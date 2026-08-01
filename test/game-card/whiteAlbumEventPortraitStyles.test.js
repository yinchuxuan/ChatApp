const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(
  __dirname,
  '../../game-card-examples/white-album-2/ui/root.css'
), 'utf8');
const platformCss = fs.readFileSync(path.join(
  __dirname,
  '../../src/renderer/styles/components.app.css'
), 'utf8');

describe('white album event portrait styles', () => {
  test('hides the event trigger button', () => {
    document.head.innerHTML = `<style>${css}</style>`;
    document.body.innerHTML = `
      <div class="game-card-theme-white-album-2">
        <button class="wa2-event-trigger"></button>
      </div>`;

    expect(getComputedStyle(document.querySelector('.wa2-event-trigger')).display).toBe('none');
  });

  test('centers a single portrait', () => {
    document.head.innerHTML = `<style>${platformCss}\n${css}</style>`;
    document.body.innerHTML = `
      <div class="app-container game-card-theme-white-album-2">
        <div data-gc-part="portrait-layer" data-count="1">
          <div class="app-portrait-slot">
            <img class="app-portrait-image">
          </div>
        </div>
      </div>`;
    const style = getComputedStyle(document.querySelector('.app-portrait-slot'));

    expect(style.position).toBe('absolute');
    expect(style.left).toBe('50%');
    expect(style.bottom).toBe('0px');
    expect(style.height).toBe('100%');
    expect(style.transform).toBe('translateX(-50%)');
  });

  test('hides the portrait layer while the event panel is open', () => {
    document.head.innerHTML = `<style>${css}</style>`;
    document.body.innerHTML = `
      <div class="app-container game-card-theme-white-album-2">
        <div data-gc-part="portrait-layer"></div>
        <div class="wa2-event-root" data-open="false"></div>
      </div>`;
    const portrait = document.querySelector('[data-gc-part="portrait-layer"]');
    const eventRoot = document.querySelector('.wa2-event-root');

    expect(getComputedStyle(portrait).transition).toBe('opacity 240ms ease');
    eventRoot.dataset.open = 'true';
    expect(getComputedStyle(portrait).opacity).toBe('0');
  });
});
