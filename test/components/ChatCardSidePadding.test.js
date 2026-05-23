/**
 * Tests for ChatPanel Component - Reading Column Width
 * Verifies that chat content uses the fixed immersive reading column.
 */

const { execSync } = require('child_process');

describe('Chat Area Reading Column Width', () => {
  test('chat-history defines 720px reading column and responsive side padding', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-panel.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?--chat-reading-width:\s*720px/);
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?padding:\s*20px\s+clamp\(20px,\s*8vw,\s*96px\)\s+20px/);
  });

  test('chat-message rows use the shared 720px reading column', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-messages.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    expect(cssContent).toMatch(/\.chat-message-row\s*\{[\s\S]*?max-width:\s*var\(--chat-reading-width,\s*720px\)/);
    expect(cssContent).not.toMatch(/\.chat-message-row\s*\{[\s\S]*?padding-right:\s*40px/);
    expect(cssContent).toMatch(/\.chat-message-bubble\s*\{[\s\S]*?width:\s*100%/);
  });

  test('retry button sits in the veil gutter without shrinking text column', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-messages.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?right:\s*-44px/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?background:\s*transparent/);
    expect(cssContent).toMatch(/\.chat-message-row:has\(\.chat-message:hover\) \.retry-btn,[\s\S]*?opacity:\s*0\.72 !important/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn:hover\s*\{[\s\S]*?box-shadow:\s*var\(--md-elevation-level-1\)/);
    expect(cssContent).toMatch(/@media\s*\(max-width:\s*860px\)\s*\{[\s\S]*?\.chat-message-row \.retry-btn\s*\{[\s\S]*?right:\s*8px/);
  });

  test('reading column veil is wider than text column for side breathing room', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-panel.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?--chat-veil-gutter:\s*56px/);
    expect(cssContent).toMatch(/\.chat-history::before\s*\{[\s\S]*?width:\s*min\(100%,\s*calc\(var\(--chat-reading-width\)\s*\+\s*var\(--chat-veil-gutter\)\s*\*\s*2\)\)/);
    expect(cssContent).toMatch(/\.chat-history::before\s*\{[\s\S]*?mask-image:\s*linear-gradient/);
  });

  test('quote highlighting styles are centralized in chat-quotes stylesheet', () => {
    const messagesCssPath = require('path').join(__dirname, '../../src/styles/components.chat-messages.css');
    const quotesCssPath = require('path').join(__dirname, '../../src/styles/components.chat-quotes.css');
    const indexPath = require('path').join(__dirname, '../../src/index.html');
    const messagesCss = execSync(`cat "${messagesCssPath}"`, { encoding: 'utf8' });
    const quotesCss = execSync(`cat "${quotesCssPath}"`, { encoding: 'utf8' });
    const indexHtml = execSync(`cat "${indexPath}"`, { encoding: 'utf8' });

    expect(messagesCss).not.toMatch(/\.quoted-text\s*\{/);
    expect(quotesCss).toMatch(/\.chat-bubble-content \.quoted-text\s*\{/);
    expect(indexHtml).toContain('styles/components.chat-quotes.css');
  });
});
