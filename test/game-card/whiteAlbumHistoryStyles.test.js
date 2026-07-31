const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/ui.css'),
  'utf8'
);

describe('white album message history styles', () => {
  test('moves message history onto a dedicated cinematic backdrop', () => {
    expect(css).toMatch(
      /\[data-gc-part="chat-history"\]\[data-view="history"\] \{[^}]*position: fixed;[^}]*inset: 0;[^}]*z-index: 120;[^}]*place-items: center;[^}]*background: rgba\(0, 0, 0, 0\.82\);/
    );
    expect(css).toMatch(
      /\[data-view="history"\][\s\S]*?\[data-gc-part="message-history"\] \{[^}]*width: min\(960px, 100%\);[^}]*height: min\(72vh, 720px\);/
    );
    expect(css).toMatch(
      /:has\([\s\S]*?\[data-view="history"\][\s\S]*?\) \[data-gc-part="chat-input"\],[\s\S]*?pointer-events: none;/
    );
  });
});
