const fs = require('node:fs');
const path = require('node:path');
const { card } = require('./whiteAlbumTestCard');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

const css = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/ui.css'),
  'utf8'
);

describe('white album ui styles', () => {
  test('declares a dedicated ui stylesheet', () => {
    expect(card.ui.stylesheet).toBe('ui.css');
    expect(validateGameCard(card)).toEqual({ valid: true, errors: [] });
  });

  test('scopes platform ui styling to the white album theme', () => {
    expect(css).toContain('.app-container.game-card-theme-white-album-2');
    expect(css).toContain('[data-gc-part="chat-header"]');
    expect(css).toContain('[data-gc-part="chat-input"]');
    expect(css).toContain('[data-gc-part="chat-session-panel"]');
    expect(css).toContain('[data-gc-part="bgm-button"]');
    expect(css).toContain('[data-role="assistant"] [data-gc-part="message-bubble"]');
  });

  test('uses winter white and snow themed variables', () => {
    expect(css).toContain('--gc-input-bg: rgba(250, 253, 255');
    expect(css).toContain('[data-gc-part="background-overlay"]');
    expect(css).toContain('radial-gradient(circle at 12% 0%');
    expect(css).toContain('opacity: 1 !important');
    expect(css).toContain('--game-card-veil-bg: rgba(251, 253, 255, 0.36)');
    expect(css).toContain('--gc-user-bubble-bg: rgba(238, 246, 252');
  });
});
