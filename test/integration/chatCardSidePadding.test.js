/**
 * Integration Tests - Chat Reading Column
 * Verifies that chat content uses the fixed immersive reading column.
 */

const fs = require('fs');
const path = require('path');

describe('Chat Reading Column - Integration', () => {
  const chatPanelCssPath = path.join(__dirname, '../../src/styles/components.chat-panel.css');
  const chatMessagesCssPath = path.join(__dirname, '../../src/styles/components.chat-messages.css');

  test('chat-history defines fixed 720px reading column and responsive page padding', () => {
    const cssContent = fs.readFileSync(chatPanelCssPath, 'utf8');
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?--chat-reading-width:\s*720px/);
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?padding:\s*20px\s+clamp\(20px,\s*8vw,\s*96px\)\s+20px/);
  });

  test('reading column veil is wider than the text column', () => {
    const cssContent = fs.readFileSync(chatPanelCssPath, 'utf8');
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?--chat-veil-gutter:\s*56px/);
    expect(cssContent).toMatch(/\.chat-history::before\s*\{[\s\S]*?width:\s*min\(100%,\s*calc\(var\(--chat-reading-width\)\s*\+\s*var\(--chat-veil-gutter\)\s*\*\s*2\)\)/);
  });

  test('chat-message row and bubble fill the reading column', () => {
    const cssContent = fs.readFileSync(chatMessagesCssPath, 'utf8');
    expect(cssContent).toMatch(/\.chat-message-row\s*\{[\s\S]*?max-width:\s*var\(--chat-reading-width,\s*720px\)/);
    expect(cssContent).toMatch(/\.chat-message-bubble\s*\{[\s\S]*?width:\s*100%/);
  });
});
