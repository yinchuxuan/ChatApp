const fs = require('node:fs');
const path = require('node:path');

const platformCss = fs.readFileSync(path.join(
  __dirname,
  '../../src/renderer/styles/components.app.css'
), 'utf8');
const cardCss = fs.readFileSync(path.join(
  __dirname,
  '../../game-card-examples/white-album-2/ui.css'
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

  test('scales the new 3:4 portraits down inside the cinematic frame', () => {
    expect(cardCss).toMatch(
      /\.app-portrait-layer \.app-portrait-slot \{[^}]*aspect-ratio:\s*3 \/ 4;/s
    );
    ['1', '2', '3'].forEach(count => {
      expect(cardCss).toMatch(new RegExp(
        `data-count="${count}"[^}]*\\.app-portrait-slot[,\\s\\S]*?height:\\s*84%;`
      ));
    });
    expect(cardCss).toMatch(/data-count="4"[^}]*\.app-portrait-slot \{[^}]*height:\s*80%;/s);
  });

  test('dims only the cinematic background while portraits are visible', () => {
    expect(cardCss).toMatch(
      /\[data-gc-part="background-overlay"\] \{[^}]*top:\s*var\(--wa2-cinema-frame-top\) !important;[^}]*bottom:\s*auto !important;[^}]*height:\s*var\(--wa2-cinema-frame-height\);[^}]*background:\s*transparent !important;[^}]*opacity:\s*1 !important;/s
    );
    expect(cardCss).toMatch(
      /:has\(\[data-gc-part="portrait-layer"\]\)[^{]*\[data-gc-part="background-overlay"\]::before \{[^}]*animation:\s*wa2-portrait-scrim-in var\(--app-portrait-insert-duration\) linear\s*var\(--app-background-insert-duration\) both;/s
    );
    expect(cardCss).toMatch(
      /\.has-portrait:not\(:has\(\[data-gc-part="portrait-layer"\]\)\)[^{]*\[data-gc-part="background-overlay"\]::before \{[^}]*animation:\s*wa2-portrait-scrim-out var\(--app-portrait-exit-duration\) linear both;/s
    );
    expect(cardCss).toMatch(/\[data-gc-part="background-overlay"\]::before \{[^}]*background:\s*rgba\(0, 0, 0, 0\.16\);[^}]*opacity:\s*0;/s);
    expect(cardCss).toMatch(/@keyframes wa2-portrait-scrim-in \{\s*from \{ opacity: 0; \}\s*to \{ opacity: 1; \}\s*\}/s);
    expect(cardCss).toMatch(/@keyframes wa2-portrait-scrim-out \{\s*from \{ opacity: 1; \}\s*to \{ opacity: 0; \}\s*\}/s);
  });
});
