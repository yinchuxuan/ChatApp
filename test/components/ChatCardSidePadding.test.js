/**
 * Tests for ChatPanel Component - Card Side Padding
 * Verifies that all chat area cards have 10% left/right side padding
 */

const { execSync } = require('child_process');

describe('Chat Area Card Side Padding', () => {
  test('chat-history CSS rule has 10% horizontal padding', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-panel.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    // Verify the .chat-history rule has 10% horizontal padding
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?padding:\s*20px\s+10%\s+80px/);
  });

  test('chat-message bubbles have full width for parent padding effect', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-messages.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    // Verify message bubbles fill the container width
    expect(cssContent).toMatch(/\.chat-message-bubble\s*\{[\s\S]*?width:\s*100%/);
  });

  test('msg-history-card has full width for parent padding effect', () => {
    const cssPath = require('path').join(__dirname, '../../src/styles/components.chat-panel.css');
    const cssContent = execSync(`cat "${cssPath}"`, { encoding: 'utf8' });

    // Verify msg-history-card fills the container width
    expect(cssContent).toMatch(/\.msg-history-card\s*\{[\s\S]*?width:\s*100%/);
  });
});
