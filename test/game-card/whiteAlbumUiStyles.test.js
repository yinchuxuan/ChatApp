const fs = require('node:fs');
const path = require('node:path');
const { card } = require('./whiteAlbumTestCard');
const { validateGameCard } = require('../../src/shared/game-card/schema/validateGameCard');

const css = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/ui.css'),
  'utf8'
);
const displayCss = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/display.css'),
  'utf8'
);
const rootCss = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/ui/root.css'),
  'utf8'
);

describe('white album ui styles', () => {
  test('declares a dedicated ui stylesheet', () => {
    expect(card.ui.stylesheet).toBe('ui.css');
    expect(card.ui.root).toMatchObject({ type: 'react', source: 'ui/root.js', style: 'ui/root.css' });
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
    expect(css).toContain('background: transparent !important');
    expect(css).toContain('opacity: 0 !important');
    expect(css).toContain('--game-card-veil-bg: rgba(248, 252, 255, 0.50)');
    expect(css).toContain('--game-card-veil-bg-dark: rgba(248, 252, 255, 0.50)');
    expect(css).toContain('--gc-user-bubble-bg: rgba(248, 252, 255, 0.50)');
  });

  test('styles the input as a default-hidden floating glass pill', () => {
    expect(css).toContain('[data-gc-part="chat-input"]');
    expect(css).toContain('left: clamp(128px, 11vw, 208px)');
    expect(css).toContain('right: clamp(128px, 11vw, 208px)');
    expect(css).toContain('min-height: 52px');
    expect(css).toContain('border-radius: 999px');
    expect(css).toContain('rgba(238, 247, 253, 0.12)');
    expect(css).toContain('0 12px 28px rgba(34, 55, 78, 0.08)');
    expect(css).toContain('backdrop-filter: blur(4px) saturate(1.03)');
    expect(css).toContain('-webkit-mask: var(--icon-edit) center / contain no-repeat');
    expect(css).toContain('content: "Enter  发送"');
    expect(css).toContain('[data-gc-part="chat-input-textarea"]');
    expect(css).toContain('padding: 3px 88px 3px 0');
    expect(css).toContain('width: 42px');
    expect(css).toContain('[data-gc-part="chat-send-button"]:not(:disabled):hover');
    expect(css).toContain('@media (max-width: 720px)');
    expect(css).not.toMatch(/\[data-gc-part="chat-input"\] \{[^}]*visibility: visible;/);
  });

  test('only shows the input when the segmented reading page contains choices', () => {
    expect(css).toContain(':has(.segmented-reading-bubble):not(:has(.segmented-reading-bubble .wa2-choice))');
    expect(css).toContain('[data-gc-part="chat-input-trigger"]');
    expect(css).not.toContain(':has(.segmented-reading-bubble:not(:has(');
    expect(css).toMatch(/:has\(\.segmented-reading-bubble\):not\(:has\(\.segmented-reading-bubble \.wa2-choice\)\)[^{]*\[data-gc-part="chat-input"\][\s\S]*?display: none;/);
  });

  test('places plain text without a glass surface inside the lower cinematic bar', () => {
    expect(css).toContain('top: var(--wa2-cinema-frame-bottom)');
    expect(css).toContain('padding: var(--wa2-cinema-text-gap) clamp(24px, 8vw, 160px)');
    expect(css).toContain('padding: clamp(10px, 1.5vh, 18px) clamp(28px, 6vw, 88px)');
    expect(css).toContain('height: 100%');
    expect(css).toContain('min-height: 0');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('[data-gc-part="message-list"]');
    expect(css).toContain('[data-gc-part="message-list"]::-webkit-scrollbar');
    expect(css).toContain('[data-gc-part="message-history-content"]');
    expect(css).toContain('color: var(--gc-assistant-bubble-text)');
    expect(css).toMatch(/\[data-gc-part="message-history"\] \{[\s\S]*?border: 0;[\s\S]*?background: transparent;[\s\S]*?box-shadow: none;[\s\S]*?backdrop-filter: none;/);
    expect(css).not.toContain('[data-gc-part="collapsed-message-view"]::before');
    expect(css).not.toContain('[data-gc-part="message-surface"]::after');
  });

  test('uses a shared full-width 2.4:1 frame for background and portrait', () => {
    expect(css).toContain('--wa2-cinema-frame-height: calc(100vw / 2.4)');
    expect(css).toContain('--wa2-cinema-frame-top: calc((100vh - var(--wa2-cinema-frame-height)) / 2)');
    expect(css).toContain('--wa2-cinema-frame-bottom: calc(50vh + var(--wa2-cinema-frame-height) / 2)');
    expect(css).toContain('.app-background-layer');
    expect(css).toContain('[data-gc-part="portrait-layer"]');
    expect(css).toContain('inset: var(--wa2-cinema-frame-top) 0 auto');
    expect(css).toContain('height: var(--wa2-cinema-frame-height)');
    expect(css).toContain('aspect-ratio: 12 / 5');
  });

  test('hides user messages and centers assistant text like cinematic subtitles', () => {
    expect(css).toContain('[data-role="user"][data-gc-part="message-row"]');
    expect(css).toMatch(/\[data-role="user"\]\[data-gc-part="message-row"\] \{\s*display: none;/);
    expect(css).toContain('[data-role="assistant"][data-gc-part="message-row"]');
    expect(css).toContain('align-items: center');
    expect(css).toContain('justify-content: center');
    expect(css).toContain('font-size: clamp(14px, 1vw, 16px)');
    expect(css).toContain('line-height: 1.55');
    expect(css).toContain('letter-spacing: 0.04em');
    expect(css).toContain('text-align: center');
    expect(css).toContain('text-shadow: 0 1px 3px rgba(0, 0, 0, 0.72)');
  });

  test('keeps the WA2 text area white and serif-rendered across themes', () => {
    expect(css).toContain('--gc-assistant-bubble-text: #ffffff');
    expect(css).toContain('--game-card-text-color: #ffffff');
    expect(css).toContain('--game-card-text-color-dark: #ffffff');
    expect(css).toContain('--game-card-text-weight: 400');
    expect(css).toContain('--gc-message-font: "Songti SC"');
    expect(css).toContain('--gc-message-font-size: 14px');
    expect(css).toContain('--gc-message-line-height: 1.96');
    expect(css).toContain('--game-card-text-line-height: 1.96');
    expect(css).toContain('--game-card-paragraph-line-height: 2.12');
    expect(displayCss).not.toContain('[data-theme="dark"] .chat-bubble-content .wa2-choice');
    expect(displayCss).toContain('[data-gc-part="message-content"] .wa2-choice-prompt');
    expect(displayCss).toContain('[data-gc-part="message-content"] .wa2-choice-label::after');
  });

  test('keeps scene meta plain and presents choices as a fullscreen text menu', () => {
    expect(displayCss).toContain('--wa2-icon-time');
    expect(displayCss).toContain('--wa2-icon-place');
    expect(displayCss).toMatch(/\.wa2-scene-meta \{[\s\S]*?width: fit-content;[\s\S]*?justify-content: center;[\s\S]*?margin: 0 auto 0\.95rem;[\s\S]*?padding: 0;[\s\S]*?border: 0;[\s\S]*?background: transparent;[\s\S]*?box-shadow: none;/);
    expect(displayCss).toContain('font-size: 13px');
    expect(displayCss).toContain('line-height: 1.42');
    expect(displayCss).toContain('.wa2-scene-time::before');
    expect(displayCss).toContain('background: var(--wa2-icon-time) center / contain no-repeat');
    expect(displayCss).toContain('.wa2-scene-place::before');
    expect(displayCss).toContain('background: var(--wa2-icon-place) center / contain no-repeat');
    expect(displayCss).toMatch(/\.wa2-scene-time::before \{[^}]*flex: 0 0 auto;/);
    expect(displayCss).not.toMatch(/\.wa2-scene-(?:time|place)::before \{[^}]*position: absolute;/);
    expect(displayCss).toMatch(/\.wa2-scene-place \{[^}]*margin-left: 0\.8rem;[^}]*padding-left: 0\.8rem;[^}]*border-left: 1px solid rgba\(255, 255, 255, 0\.34\);/);
    expect(displayCss).toMatch(/:has\(\.wa2-choice-overlay\)::after \{[^}]*position: fixed;[^}]*inset: 0;[^}]*z-index: 2;[^}]*background: rgba\(0, 0, 0, 0\.72\);[^}]*pointer-events: none;/);
    expect(displayCss).toMatch(/\.segmented-reading-page:has\(\.wa2-choice-overlay\) \{[^}]*position: fixed;[^}]*inset: 0;[^}]*z-index: 9;[^}]*opacity: 1;[^}]*visibility: visible;[^}]*animation: none;[^}]*transform: translateZ\(0\);[^}]*backface-visibility: hidden;[^}]*background: transparent;/);
    expect(displayCss).toMatch(/:has\(\.wa2-choice-overlay\) \[data-gc-part="message-list"\] \{[^}]*transform: none !important;[^}]*will-change: auto;/);
    expect(displayCss).toMatch(/\[data-gc-part="collapsed-message-view"\],[\s\S]*?\[data-gc-part="message-list"\] \{[^}]*overflow: visible;[^}]*isolation: auto;/);
    expect(displayCss).toMatch(/:has\(\.wa2-choice-overlay\) \.app-content-wrapper \{[^}]*z-index: 3;/);
    expect(displayCss).not.toMatch(/:has\(\.wa2-choice-overlay\) \[data-gc-part="chat-history"\] \{[^}]*z-index:/);
    expect(displayCss).toMatch(/:has\(\.wa2-choice-overlay\) \[data-gc-part="chat-input"\] \{[^}]*z-index: 210;/);
    expect(displayCss).toMatch(/\[data-gc-part="chat-header-trigger"\],[\s\S]*?\[data-gc-part="chat-input-trigger"\] \{[^}]*z-index: 10;/);
    expect(displayCss).toMatch(/\.segmented-reading-page:has\(\.wa2-choice-overlay\)[\s\S]*?> \[data-gc-part="message-content"\] \{[^}]*flex: none;[^}]*width: clamp\(280px, 50vw, 680px\);[^}]*max-width: 100%;/);
    expect(displayCss).toMatch(/\.wa2-choice-overlay \{[^}]*width: 100%;/);
    expect(displayCss).toMatch(/\.wa2-choice-overlay \{[^}]*align-items: stretch;[^}]*text-align: left;/);
    expect(displayCss).toContain('[data-gc-part="message-content"] .wa2-choice-prompt');
    expect(displayCss).toMatch(/\.wa2-choice \{[^}]*width: 100%;[^}]*align-items: flex-start;[^}]*justify-content: flex-start;[^}]*border: 0;[^}]*background: transparent;[^}]*text-align: left;/);
    expect(displayCss).toMatch(/\.wa2-choice-label \{[^}]*flex: 0 0 auto;[^}]*color: inherit;[^}]*font-weight: inherit;[^}]*letter-spacing: inherit;/);
    expect(displayCss).not.toMatch(/\.wa2-choice-label \{[^}]*(?:justify-content|text-align):/);
    expect(displayCss).not.toMatch(/\.wa2-choice:hover,[\s\S]*?transform:/);
    expect(displayCss).not.toContain('-webkit-mask: var(--wa2-icon-time)');
    expect(displayCss).not.toContain('.wa2-choice::before');
  });

  test('renders quoted dialogue like normal body text in light and dark WA2 modes', () => {
    expect(css).toContain('[data-gc-part="message-content"] .quoted-text');
    expect(css).toMatch(/\[data-theme="dark"\][^{]*\.quoted-text/);
    expect(css).toMatch(/\.quoted-text \{[^}]*color: inherit;[^}]*font-weight: inherit;[^}]*text-decoration: none;[^}]*text-shadow: inherit;/);
    expect(css).not.toContain('--wa2-highlight-text-color');
  });
  test('avoids platform implementation class selectors', () => {
    expect(`${css}\n${displayCss}\n${rootCss}`).not.toMatch(/\.(?:chat|msg)-(?:messages-layer|message|bubble-content|history)/);
  });
});
