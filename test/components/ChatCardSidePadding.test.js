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
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?isolation:\s*isolate/);
  });

  test('chat-message rows use the shared 720px reading column', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-messages.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    expect(cssContent).toMatch(/\.chat-messages-layer\s*\{[\s\S]*?z-index:\s*1/);
    expect(cssContent).toMatch(/\.chat-message-row\s*\{[\s\S]*?max-width:\s*var\(--chat-reading-width,\s*720px\)/);
    expect(cssContent).not.toMatch(/\.chat-message-row\s*\{[\s\S]*?padding-right:\s*40px/);
    expect(cssContent).toMatch(/\.chat-message-bubble\s*\{[\s\S]*?width:\s*100%/);
  });

  test('retry button is a transparent edge action on the user message', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-messages.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    expect(cssContent).toMatch(/\.chat-message\.user \.chat-message-bubble\s*\{[\s\S]*?padding:\s*18px\s+28px/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?width:\s*44px !important/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?height:\s*auto !important/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?min-height:\s*44px !important/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?top:\s*0/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?right:\s*0/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?bottom:\s*0/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?background:\s*transparent/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?opacity:\s*0/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn\s*\{[\s\S]*?pointer-events:\s*none/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn::before\s*\{[\s\S]*?display:\s*none/);
    expect(cssContent).toMatch(/\.retry-source-row \.chat-message\.user \.chat-message-bubble\s*\{[\s\S]*?padding-left:\s*32px/);
    expect(cssContent).toMatch(/\.retry-source-row \.chat-message\.user \.chat-message-bubble\s*\{[\s\S]*?padding-right:\s*72px/);
    expect(cssContent).toMatch(/\.retry-source-row:has\(\.chat-message\.user:hover\) \.retry-btn\s*\{/);
    expect(cssContent).toMatch(/\.retry-source-row:has\(\.retry-btn:hover\) \.retry-btn\s*\{[\s\S]*?pointer-events:\s*auto/);
    expect(cssContent).toMatch(/\.retry-source-row:has\(\.chat-message\.user:hover\) \.retry-btn\s*\{[\s\S]*?rgba\(255,\s*255,\s*255,\s*0\.22\)/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn:hover\s*\{[\s\S]*?color:\s*var\(--md-on-primary\)/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn:hover\s*\{[\s\S]*?background:\s*var\(--md-primary\)/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn:hover\s*\{[\s\S]*?box-shadow:\s*var\(--md-elevation-level-1\)/);
    expect(cssContent).toMatch(/\.chat-message-row \.retry-btn:hover\s*\{[\s\S]*?transform:\s*scaleX\(1\.06\)/);
    expect(cssContent).toMatch(/\.retry-btn:hover \.material-icons\s*\{[\s\S]*?transform:\s*rotate\(-18deg\) scale\(1\.06\)/);
    expect(cssContent).toMatch(/@media\s*\(max-width:\s*960px\)\s*\{[\s\S]*?\.retry-source-row \.chat-message\.user \.chat-message-bubble\s*\{[\s\S]*?padding-right:\s*68px/);
  });

  test('reading column veil is wider than text column for side breathing room', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-panel.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?--chat-veil-gutter:\s*56px/);
    expect(cssContent).toMatch(/\.chat-history::before\s*\{[\s\S]*?display:\s*none/);
    expect(cssContent).toMatch(/\.chat-reading-veil\s*\{[\s\S]*?width:\s*min\(100%,\s*calc\(var\(--chat-reading-width\)\s*\+\s*var\(--chat-veil-gutter\)\s*\*\s*2\)\)/);
    expect(cssContent).toMatch(/\.chat-reading-veil\s*\{[\s\S]*?z-index:\s*0/);
    expect(cssContent).toMatch(/\.chat-reading-veil\s*\{[\s\S]*?mask-image:\s*linear-gradient/);
    expect(cssContent).toMatch(/\.app-container\.has-background-image \.chat-reading-veil\s*\{[\s\S]*?opacity:\s*1 !important/);
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

  test('chat content stylesheet is loaded by the app shell', () => {
    const indexPath = require('path').join(__dirname, '../../src/index.html');
    const indexHtml = execSync(`cat "${indexPath}"`, { encoding: 'utf8' });

    expect(indexHtml).toContain('styles/components.chat-content.css');
  });
});
