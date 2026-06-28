const fs = require('node:fs');
const path = require('node:path');
const { card } = require('./whiteAlbumTestCard');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

const css = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/ui.css'),
  'utf8'
);
const displayCss = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/display.css'),
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
    expect(css).toContain('[data-role="assistant"] .chat-message.assistant [data-gc-part="message-bubble"]');
  });

  test('uses winter white and snow themed variables', () => {
    expect(css).toContain('--gc-input-bg: rgba(250, 253, 255');
    expect(css).toContain('[data-gc-part="background-overlay"]');
    expect(css).toContain('radial-gradient(circle at 12% 0%');
    expect(css).toContain('opacity: 0.18 !important');
    expect(css).toContain('--game-card-veil-bg: rgba(248, 252, 255, 0.50)');
    expect(css).toContain('--game-card-veil-bg-dark: rgba(248, 252, 255, 0.50)');
    expect(css).toContain('--gc-user-bubble-bg: rgba(248, 252, 255, 0.50)');
  });

  test('styles the input as a hidden floating glass pill', () => {
    expect(css).toContain('[data-gc-part="chat-input"]');
    expect(css).toContain('left: clamp(96px, 8vw, 148px)');
    expect(css).toContain('min-height: 52px');
    expect(css).toContain('border-radius: 999px');
    expect(css).toContain('backdrop-filter: blur(22px) saturate(1.28)');
    expect(css).toContain('-webkit-mask: var(--icon-edit) center / contain no-repeat');
    expect(css).toContain('content: "Enter  发送"');
    expect(css).toContain('[data-gc-part="chat-input-textarea"]');
    expect(css).toContain('padding: 3px 88px 3px 0');
    expect(css).toContain('width: 42px');
    expect(css).toContain('[data-gc-part="chat-send-button"]:not(:disabled):hover');
    expect(css).toContain('@media (max-width: 720px)');
    expect(css).not.toContain('.chat-input-area-visible');
  });

  test('styles the message list as a unified frosted glass text area', () => {
    expect(css).toContain('[data-gc-part="collapsed-message-view"]::before');
    expect(css).toContain('.chat-messages-layer::before');
    expect(css).toContain('[data-gc-part="collapsed-message-view"]::after');
    expect(css).toContain('.chat-messages-layer::after');
    expect(css).toContain('backdrop-filter: blur(7px) saturate(1.08) brightness(1)');
    expect(css).toContain('padding: 54px 50px 54px 50px');
    expect(css).toContain('isolation: isolate');
    expect(css).toContain('max-height: calc(100vh - 140px)');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('max-height: calc(100vh - 30px)');
    expect(css).toContain('-webkit-mask-image: none');
    expect(css).toContain('border-radius: 14px');
    expect(css).toContain('[data-gc-part="message-list"]');
    expect(css).toContain('width: 100%');
    expect(css).toContain('[data-gc-part="message-list"]::-webkit-scrollbar');
    expect(css).toContain('background: rgba(248, 252, 255, 0.40)');
    expect(css).toContain('background: rgba(248, 252, 255, 0.4167)');
    expect(css).toContain('linear-gradient(90deg, transparent 0, rgba(0, 0, 0, 0.01) 5px');
    expect(css).toContain('rgba(0, 0, 0, 0.68) 30px');
    expect(css).toContain('rgba(0, 0, 0, 0.99) 45px');
    expect(css).toContain('linear-gradient(180deg, transparent 0, rgba(0, 0, 0, 0.01) 5px');
    expect(css).toContain('rgba(0, 0, 0, 0.84) 38px');
    expect(css).toContain('rgba(0, 0, 0, 0.99) 49px');
    expect(css).toContain('-webkit-mask-composite: source-in');
    expect(css).toContain('mask-composite: intersect');
    expect(css).not.toContain('content: none');
    expect(css).not.toContain('inset: 54px 50px');
    expect(css).not.toContain('0 0 48px 42px rgba(248, 252, 255, 0.22)');
    expect(css).not.toContain('inset 0 42px 0 rgba(248, 252, 255, 0.96)');
    expect(css).toContain('.pinned-divider');
    expect(css).toContain('display: none');
  });

  test('keeps the visual panel close to the right app edge', () => {
    expect(css).toContain('--chat-reading-width: 860px');
    expect(css).toContain('--game-card-panel-edge-gap: 15px');
    expect(css).toContain('--game-card-panel-inner-gap: 0px');
    expect(css).toContain('game-card-visual-position-right [data-gc-part="chat-history"]');
    expect(css).toContain('padding-left: max(320px, calc(44% - var(--game-card-panel-edge-gap)))');
    expect(css).toContain('padding-top: 15px');
    expect(css).toContain('padding-bottom: 15px');
  });

  test('keeps user messages styled inside the unified text area', () => {
    expect(css).toContain('[data-role="user"][data-gc-part="message-row"]');
    expect(css).toContain('margin-top: 6px');
    expect(css).toContain('margin-bottom: 6px');
    expect(css).toContain('[data-role="user"] .chat-message.user [data-gc-part="message-bubble"]');
    expect(css).toContain('padding: 9px 18px 9px 34px');
    expect(css).toContain('font-size: 14px');
    expect(css).toContain('line-height: 1.86');
    expect(css).toContain('linear-gradient(90deg, rgba(62, 84, 105, 0.62), rgba(31, 48, 66, 0.54))');
    expect(css).toContain('backdrop-filter: blur(18px) saturate(1.22)');
    expect(css).toContain('color: #f5fbff');
    expect(css).toContain('text-shadow: 0 1px 1px rgba(0, 0, 0, 0.32)');
    expect(css).toContain('[data-role="user"] .chat-message.user [data-gc-part="message-bubble"]::before');
    expect(css).toContain('background: linear-gradient(180deg, rgba(205, 228, 244, 0.72)');
  });

  test('keeps the WA2 text area white and serif-rendered across themes', () => {
    expect(css).toContain('--gc-assistant-bubble-text: #07131f');
    expect(css).toContain('--game-card-text-color: #07131f');
    expect(css).toContain('--game-card-text-color-dark: #07131f');
    expect(css).toContain('--game-card-highlight-color-dark: #3f78a8');
    expect(css).toContain('--game-card-text-weight: 400');
    expect(css).toContain('--gc-message-font: "Songti SC"');
    expect(css).toContain('--gc-message-font-size: 14px');
    expect(css).toContain('--gc-message-line-height: 1.96');
    expect(css).toContain('--game-card-text-line-height: 1.96');
    expect(css).toContain('--game-card-paragraph-line-height: 2.12');
    expect(displayCss).not.toContain('[data-theme="dark"] .chat-bubble-content .wa2-choice');
    expect(displayCss).toContain('.chat-bubble-content .wa2-choice:last-child');
    expect(displayCss).toContain('padding: 0.58rem 1.28rem 0.58rem 0.88rem');
  });

  test('uses user bubble styling for scene meta and choice controls', () => {
    expect(displayCss).toContain('--wa2-icon-time');
    expect(displayCss).toContain('--wa2-icon-place');
    expect(displayCss).toContain('display: flex');
    expect(displayCss).toContain('width: 100%');
    expect(displayCss).toContain('box-sizing: border-box');
    expect(displayCss).toContain('padding: 0.34rem 1.18rem 0.34rem 2.45rem');
    expect(displayCss).toContain('font-size: 13px');
    expect(displayCss).toContain('line-height: 1.42');
    expect(displayCss).toContain('.wa2-scene-time::before');
    expect(displayCss).toContain('background: var(--wa2-icon-time) center / contain no-repeat');
    expect(displayCss).toContain('.wa2-scene-place::before');
    expect(displayCss).toContain('background: var(--wa2-icon-place) center / contain no-repeat');
    expect(displayCss).toContain('border-left: 1px solid rgba(96, 145, 184, 0.36)');
    expect(displayCss).toContain('border: 1px solid rgba(255, 255, 255, 0.38)');
    expect(displayCss).toContain('border-radius: 7px');
    expect(displayCss).toContain('linear-gradient(var(--gc-user-bubble-bg), var(--gc-user-bubble-bg))');
    expect(displayCss).toContain('inset 0 0 18px rgba(255, 255, 255, 0.12)');
    expect(displayCss).toContain('color: var(--gc-assistant-bubble-text)');
    expect(displayCss).not.toContain('-webkit-mask: var(--wa2-icon-time)');
    expect(displayCss).not.toContain('.wa2-choice::before');
  });

  test('keeps quoted dialogue from using dark theme blue highlights', () => {
    expect(css).toContain('.chat-message.assistant .chat-bubble-content .quoted-text');
    expect(css).toContain('.chat-message.user .chat-bubble-content .quoted-text');
    expect(css).toContain('color: var(--gc-assistant-bubble-text)');
    expect(css).toContain('text-decoration-color: color-mix(in srgb, var(--gc-assistant-bubble-text) 36%, transparent)');
  });
});
