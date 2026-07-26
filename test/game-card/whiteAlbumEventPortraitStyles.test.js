const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(
  __dirname,
  '../../game-card-examples/white-album-2/ui/root.css'
), 'utf8');

describe('white album event portrait styles', () => {
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
