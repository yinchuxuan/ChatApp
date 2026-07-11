const fs = require('fs');
const path = require('path');

describe('Chat thinking styles', () => {
  const styleFiles = [
    '../../src/styles/components.chat-messages.css',
    '../../src/styles/components.chat-content.css'
  ];
  const css = styleFiles.map((file) => (
    fs.readFileSync(path.join(__dirname, file), 'utf8')
  )).join('\n');

  test('defines thinking text and clickable bubble styles', () => {
    expect(css).toMatch(/\.chat-thinking-text\s*\{/);
    expect(css).toMatch(/\.bubble-clickable\s*\{/);
  });
});
