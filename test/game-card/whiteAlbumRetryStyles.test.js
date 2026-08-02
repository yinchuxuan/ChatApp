const fs = require('node:fs');
const path = require('node:path');

const css = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/ui/root.css'),
  'utf8'
);

describe('white album 2 retry styles', () => {
  test('renders a full-screen cinematic pause layer without a persistent trigger', () => {
    expect(css).toMatch(/\.wa2-retry-layer \{[\s\S]*?position: fixed;[\s\S]*?inset: 0;/);
    expect(css).toMatch(/\.wa2-retry-layer \{[\s\S]*?background: rgba\(0, 0, 0, 0\.82\);/);
    expect(css).toMatch(/\.wa2-retry-panel \{[\s\S]*?width: clamp\(300px, 46vw, 620px\);/);
    expect(css).toMatch(/\.wa2-retry-editor \{[\s\S]*?background: transparent;/);
    expect(css).toMatch(/\.wa2-retry-action \{[\s\S]*?background: transparent;/);
    expect(css).toMatch(/\.wa2-retry-kicker \{[\s\S]*?font-size: clamp\(20px, 1\.8vw, 26px\);[\s\S]*?font-weight: 700;/);
    expect(css).toMatch(/\.wa2-retry-title \{[\s\S]*?font-size: clamp\(16px, 1\.3vw, 19px\);/);
    expect(css).toContain(':has(.wa2-ui-root[data-paused="true"])');
    expect(css).not.toContain('.wa2-pause-trigger');
  });
});
