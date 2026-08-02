const fs = require('node:fs');
const path = require('node:path');

const platformCss = fs.readFileSync(path.join(
  __dirname,
  '../../src/renderer/styles/components.app.css'
), 'utf8');

describe('white album portrait styles', () => {
  test('centers a single portrait', () => {
    document.head.innerHTML = `<style>${platformCss}</style>`;
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
});
