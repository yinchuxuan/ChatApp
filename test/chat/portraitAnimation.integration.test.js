const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(
  __dirname,
  '../../src/renderer/styles/components.app.css'
), 'utf8');

describe('portrait animation styles', () => {
  test('fades the portrait in after the background animation', () => {
    expect(css).toMatch(/\.app-container\s*{[^}]*--app-background-insert-duration:\s*800ms;[^}]*--app-portrait-insert-duration:\s*500ms;[^}]*--app-portrait-expression-duration:\s*160ms;/s);
    expect(css).toMatch(/\.app-background-layer-current\s*{[^}]*animation:\s*app-background-fade-in\s+var\(--app-background-insert-duration\)\s+linear\s+both;/s);
    expect(css).toMatch(/\.app-portrait-image\[data-transition="enter"\]\s*{[^}]*animation:\s*app-portrait-fade-in\s+var\(--app-portrait-insert-duration\)\s+linear\s+var\(--app-background-insert-duration\)\s+both;/s);
    expect(css).toMatch(/@keyframes app-portrait-fade-in\s*{\s*from\s*{\s*opacity:\s*0;\s*}\s*to\s*{\s*opacity:\s*1;\s*}\s*}/s);
  });

  test('uses a short fade without delay for expression changes', () => {
    expect(css).toMatch(/\.app-portrait-image\[data-transition="expression"\]\s*{[^}]*animation:\s*app-portrait-fade-in\s+var\(--app-portrait-expression-duration\)\s+ease-out\s+both;/s);
  });

  test('automatically positions and scales up to four portrait slots', () => {
    expect(css).toMatch(/\.app-portrait-slot\s*{[^}]*position:\s*absolute;[^}]*bottom:\s*0;[^}]*left:\s*50%;[^}]*height:\s*100%;[^}]*aspect-ratio:\s*4\s*\/\s*3;/s);
    expect(css).toContain('.app-portrait-layer[data-count="4"] .app-portrait-slot[data-index="3"]');
    expect(css).toMatch(/\.app-portrait-layer\[data-count="4"\] \.app-portrait-slot\s*{[^}]*height:\s*74%;/s);
  });
});
