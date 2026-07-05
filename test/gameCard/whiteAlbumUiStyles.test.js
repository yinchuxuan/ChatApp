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
const eventRootCss = fs.readFileSync(
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
    expect(css).toContain('[data-role="assistant"] .chat-message.assistant [data-gc-part="message-bubble"]');
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
    expect(css).not.toContain('visibility: visible');
  });

  test('styles the message list as a unified frosted glass text area', () => {
    expect(css).toContain('[data-gc-part="collapsed-message-view"]::before');
    expect(css).toContain('.chat-messages-layer::before');
    expect(css).toContain('.msg-history-card::before');
    expect(css).toContain('[data-gc-part="collapsed-message-view"]::after');
    expect(css).toContain('.chat-messages-layer::after');
    expect(css).toContain('.msg-history-card::after');
    expect(css).toContain('backdrop-filter: blur(7px) saturate(1.08) brightness(1)');
    expect(css).toContain('padding: 54px 64px 30px 64px');
    expect(css).toContain('--wa2-reading-panel-height: calc(100vh - 44px)');
    expect(css).toContain('height: var(--wa2-reading-panel-height)');
    expect(css).toContain('max-height: var(--wa2-reading-panel-height)');
    expect(css).toContain('min-height: min(560px, var(--wa2-reading-panel-height))');
    expect(css).toContain('isolation: isolate');
    expect(css).toContain('max-height: none');
    expect(css).toContain('height: 100%');
    expect(css).toContain('min-height: 0');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('-webkit-mask-image: none');
    expect(css).toContain('border-radius: 14px');
    expect(css).toContain('[data-gc-part="message-list"]');
    expect(css).toContain('width: 100%');
    expect(css).toContain('[data-gc-part="message-list"]::-webkit-scrollbar');
    expect(css).toContain('.msg-history-json');
    expect(css).toContain('color: var(--gc-assistant-bubble-text)');
    expect(css).toContain('radial-gradient(circle at 9% 8%');
    expect(css).toContain('radial-gradient(circle at 48% 92%');
    expect(css).toContain('background-repeat: no-repeat');
    expect(css).toContain('background-size: 100% 100%');
    expect(css).toContain('opacity: 0.46');
    expect(css).toContain('background: rgba(255, 255, 255, 0.18);');
    expect(css).toContain('background: rgba(255, 255, 255, 0.70);');
    expect(css).toContain('filter: drop-shadow(0 0 1px rgba(255, 255, 255, 0.18))');
    expect(css).toContain('-webkit-mask: none');
    expect(css).toContain('mask: none');
    expect(css).not.toContain('content: none');
    expect(css).not.toContain('inset: 54px 50px');
    expect(css).not.toContain('0 0 48px 42px rgba(248, 252, 255, 0.22)');
    expect(css).not.toContain('inset 0 42px 0 rgba(248, 252, 255, 0.96)');
    expect(css).toContain('.pinned-divider');
    expect(css).toContain('display: none');
  });

  test('keeps the visual panel close to the right app edge', () => {
    expect(css).toContain('--chat-reading-width: 860px');
    expect(css).toContain('--game-card-panel-edge-gap: 22px');
    expect(css).toContain('--game-card-panel-inner-gap: 0px');
    expect(css).toContain('game-card-visual-position-right [data-gc-part="chat-history"]');
    expect(css).toContain('padding-left: max(352px, calc(46% - var(--game-card-panel-edge-gap)))');
    expect(css).toContain('padding-top: 22px');
    expect(css).toContain('padding-bottom: 22px');
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

  test('uses the same quoted dialogue highlight in light and dark WA2 modes', () => {
    expect(css).toContain('[data-theme="dark"] .app-container.game-card-theme-white-album-2 .chat-message.assistant .chat-bubble-content .quoted-text');
    expect(css).toContain('[data-theme="dark"] .app-container.game-card-theme-white-album-2 .chat-message.user .chat-bubble-content .quoted-text');
    expect(css).toContain('color: var(--game-card-highlight-color-light, var(--game-card-highlight-color, #1E3A5F))');
    expect(css).toContain('text-decoration-color: color-mix(in srgb, var(--game-card-highlight-color-light, var(--game-card-highlight-color, #1E3A5F)) 52%, transparent)');
  });

  test('styles the local event panel as a frosted ui widget', () => {
    expect(eventRootCss).toContain('.wa2-event-root');
    expect(eventRootCss).toContain('.wa2-event-trigger');
    expect(eventRootCss).toContain('.wa2-event-panel');
    expect(eventRootCss).toContain('--wa2-event-trigger-icon: url("data:image/svg+xml');
    expect(eventRootCss).toContain('--wa2-event-panel-left: max(352px, calc(46% - var(--game-card-panel-edge-gap, 22px)))');
    expect(eventRootCss).toContain('--wa2-event-trigger-left: calc(var(--wa2-event-panel-left) + 36px)');
    expect(eventRootCss).toContain('top: calc(var(--wa2-event-panel-top) - 2px)');
    expect(eventRootCss).toContain('font-family: "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif');
    expect(eventRootCss).toContain('-webkit-mask: var(--wa2-event-trigger-icon) center / contain no-repeat');
    expect(eventRootCss).toMatch(/border: 1px solid transparent[\s\S]*border-radius: 999px[\s\S]*color: rgba\(3, 10, 18, 0\.96\)[\s\S]*font-weight: 600[\s\S]*border-color: color-mix[\s\S]*width: 22px/);
    expect(eventRootCss).toContain('padding: 54px 64px 30px');
    expect(eventRootCss).toContain('pointer-events: none');
    expect(eventRootCss).toContain('pointer-events: auto');
    expect(eventRootCss).toContain(':has(.wa2-event-root[data-open="true"])');
    expect(eventRootCss).toContain('[data-gc-part="collapsed-message-view"]');
    expect(eventRootCss).toContain('opacity: 0');
    expect(eventRootCss).toMatch(/background: rgba\(255, 255, 255, 0\.18\)[\s\S]*backdrop-filter: blur\(7px\) saturate\(1\.08\) brightness\(1\)/);
    expect(eventRootCss).toMatch(/radial-gradient\(circle at 52% 88%[\s\S]*background: rgba\(255, 255, 255, 0\.70\)[\s\S]*-webkit-mask: none[\s\S]*z-index: 2/);
    expect(eventRootCss).toMatch(/\.wa2-event-content[\s\S]*overflow-y: auto[\s\S]*\.wa2-event-body \.chat-message-bubble[\s\S]*\.wa2-event-body \.chat-bubble-content p/);
  });
});
