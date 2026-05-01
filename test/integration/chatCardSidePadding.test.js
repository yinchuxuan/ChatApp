/**
 * Integration Tests - Chat Card Side Padding
 * Verifies that 10% side padding is applied to all chat area cards
 */

const fs = require('fs');
const path = require('path');

describe('Chat Card Side Padding - Integration', () => {
  const chatPanelCssPath = path.join(__dirname, '../../src/styles/components.chat-panel.css');
  const chatMessagesCssPath = path.join(__dirname, '../../src/styles/components.chat-messages.css');

  test('chat-history container has 10% horizontal padding', () => {
    const cssContent = fs.readFileSync(chatPanelCssPath, 'utf8');
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?padding:\s*20px\s+10%\s+80px/);
  });

  test('msg-history-card has full width to inherit container padding', () => {
    const cssContent = fs.readFileSync(chatPanelCssPath, 'utf8');
    expect(cssContent).toMatch(/\.msg-history-card\s*\{[\s\S]*?width:\s*100%/);
  });

  test('chat-message-bubble has full width to inherit container padding', () => {
    const cssContent = fs.readFileSync(chatMessagesCssPath, 'utf8');
    expect(cssContent).toMatch(/\.chat-message-bubble\s*\{[\s\S]*?width:\s*100%/);
  });
});
