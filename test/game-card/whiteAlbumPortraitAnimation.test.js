const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(path.join(
  __dirname,
  '../../game-card-examples/white-album-2/ui.css'
), 'utf8');

test('WA2 fades portraits in and out over 600ms', () => {
  expect(css).toMatch(/--app-portrait-insert-duration:\s*600ms/);
  expect(css).toMatch(/--app-portrait-exit-duration:\s*600ms/);
});

test('WA2 crossfades portrait expressions over 300ms', () => {
  expect(css).toMatch(/--app-portrait-expression-duration:\s*300ms/);
  expect(css).toMatch(/--app-portrait-expression-exit-duration:\s*300ms/);
});

test('keeps exiting portraits inside the same cinematic frame', () => {
  expect(css).toMatch(
    /\[data-gc-part="portrait-layer"\],\s*\.app-container\.game-card-theme-white-album-2 \.app-portrait-layer-exiting\s*{[^}]*inset:\s*var\(--wa2-cinema-frame-top\) 0 auto;[^}]*height:\s*var\(--wa2-cinema-frame-height\);/s
  );
});
