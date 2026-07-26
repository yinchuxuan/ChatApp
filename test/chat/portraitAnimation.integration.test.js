const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(
  __dirname,
  '../../src/renderer/styles/components.app.css'
), 'utf8');

describe('portrait animation styles', () => {
  test('fades each portrait in with the emphasized motion timing', () => {
    expect(css).toMatch(/\.app-portrait-image\s*{[^}]*animation:\s*app-portrait-fade-in\s+var\(--md-motion-duration-medium2\)\s+var\(--md-motion-easing-emphasized-decelerate\)\s+both;/s);
    expect(css).toMatch(/@keyframes app-portrait-fade-in\s*{\s*from\s*{\s*opacity:\s*0;\s*}\s*to\s*{\s*opacity:\s*1;\s*}\s*}/s);
  });
});
