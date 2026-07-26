const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(
  __dirname,
  '../../src/renderer/styles/components.app.css'
), 'utf8');

describe('portrait animation styles', () => {
  test('fades the portrait in slowly after the background animation', () => {
    expect(css).toMatch(/\.app-container\s*{[^}]*--app-background-insert-duration:\s*800ms;[^}]*--app-portrait-insert-duration:\s*1200ms;/s);
    expect(css).toMatch(/\.app-background-layer-current\s*{[^}]*animation:\s*app-background-fade-in\s+var\(--app-background-insert-duration\)\s+linear\s+both;/s);
    expect(css).toMatch(/\.app-portrait-image\s*{[^}]*animation:\s*app-portrait-fade-in\s+var\(--app-portrait-insert-duration\)\s+linear\s+var\(--app-background-insert-duration\)\s+both;/s);
    expect(css).toMatch(/@keyframes app-portrait-fade-in\s*{\s*from\s*{\s*opacity:\s*0;\s*}\s*to\s*{\s*opacity:\s*1;\s*}\s*}/s);
  });
});
