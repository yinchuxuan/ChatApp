/**
 * Integration Tests - Chat Reading Column
 * Verifies that chat content uses the fixed immersive reading column.
 */

const fs = require('fs');
const path = require('path');

describe('Chat Reading Column - Integration', () => {
  const chatPanelCssPath = path.join(__dirname, '../../src/styles/components.chat-panel.css');
  const chatMessagesCssPath = path.join(__dirname, '../../src/styles/components.chat-messages.css');
  const readabilityCssPath = path.join(__dirname, '../../src/styles/components.background-readability.css');

  test('chat-history defines fixed 660px reading column and responsive page padding', () => {
    const cssContent = fs.readFileSync(chatPanelCssPath, 'utf8');
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?--chat-reading-width:\s*660px/);
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?padding:\s*20px\s+clamp\(20px,\s*8vw,\s*96px\)\s+20px/);
  });

  test('reading column veil is wider than the text column', () => {
    const cssContent = fs.readFileSync(chatPanelCssPath, 'utf8');
    const readabilityCss = fs.readFileSync(readabilityCssPath, 'utf8');
    expect(cssContent).toMatch(/\.chat-history\s*\{[\s\S]*?--chat-veil-gutter:\s*24px/);
    expect(readabilityCss).toMatch(/\.chat-reading-veil\s*\{[\s\S]*?width:\s*min\(100%,\s*calc\(var\(--chat-reading-width\)\s*\+\s*var\(--chat-veil-gutter\)\s*\*\s*2\)\)/);
    expect(cssContent).toMatch(/--game-card-panel-edge-gap:\s*40px/);
    expect(cssContent).toMatch(/--game-card-panel-inner-gap:\s*40px/);
    expect(readabilityCss).toMatch(/\.game-card-visual-position-right \.chat-reading-veil\s*\{[\s\S]*?right:\s*var\(--game-card-panel-edge-gap\);[\s\S]*?width:\s*50%/);
  });

  test('visual panel position also moves the collapsed message wrapper', () => {
    const readabilityCss = fs.readFileSync(readabilityCssPath, 'utf8');
    expect(readabilityCss).toMatch(/\.app-container\.game-card-visual-position-right \.chat-history\s*\{[\s\S]*?padding-left:\s*calc\(50% - var\(--game-card-panel-edge-gap\) \+ var\(--game-card-panel-inner-gap\)\);[\s\S]*?padding-right:\s*calc\(var\(--game-card-panel-edge-gap\) \+ var\(--game-card-panel-inner-gap\)\)/);
    expect(readabilityCss).toMatch(/\.game-card-visual-position-right \.chat-message-row,\s*[\s\S]*?\.collapse-inner-wrapper,[\s\S]*?\{[\s\S]*?margin-right:\s*0/);
    expect(readabilityCss).toMatch(/\.game-card-visual-position-right \.collapse-inner-wrapper\s*\{[\s\S]*?max-width:\s*100%/);
    expect(readabilityCss).toMatch(/\.app-container\.has-background-image\.game-card-visual-position-center \.collapse-inner-wrapper\s*\{[\s\S]*?max-width:\s*var\(--chat-reading-width,\s*660px\)/);
  });

  test('chat-message row and bubble fill the reading column', () => {
    const cssContent = fs.readFileSync(chatMessagesCssPath, 'utf8');
    expect(cssContent).toMatch(/\.chat-message-row\s*\{[\s\S]*?max-width:\s*var\(--chat-reading-width,\s*720px\)/);
    expect(cssContent).toMatch(/\.chat-message-bubble\s*\{[\s\S]*?width:\s*100%/);
  });
});
