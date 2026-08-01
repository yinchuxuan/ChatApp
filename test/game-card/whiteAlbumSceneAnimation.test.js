const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(
  __dirname,
  '../../game-card-examples/white-album-2/ui.css'
), 'utf8');

describe('white album scene animation', () => {
  test('fades scenes out and in sequentially over 600ms each', () => {
    expect(css).toMatch(/--wa2-scene-fade-duration:\s*600ms/);
    expect(css).toMatch(/\.app-background-layer-previous\s*{[^}]*animation:\s*wa2-scene-fade-out var\(--wa2-scene-fade-duration\) linear both;/s);
    expect(css).toMatch(/\.app-background-layer-current\s*{[^}]*animation:\s*wa2-scene-fade-in var\(--wa2-scene-fade-duration\) linear both;/s);
    expect(css).toMatch(/\.app-background-layer-previous\s*\+ \.app-background-layer-current\s*{[^}]*animation-delay:\s*var\(--wa2-scene-fade-duration\);/s);
  });

  test('keeps the first scene free of the transition delay', () => {
    const currentRule = css.match(
      /\.app-container\.game-card-theme-white-album-2 \.app-background-layer-current\s*{([^}]*)}/s
    );
    expect(currentRule?.[1]).not.toContain('animation-delay');
  });
});
