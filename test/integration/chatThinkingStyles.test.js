const fs = require('fs');
const path = require('path');

describe('Chat thinking styles', () => {
  const css = fs.readFileSync(
    path.join(__dirname, '../../src/styles/components.chat-messages.css'),
    'utf8'
  );

  test('defines thinking text and clickable bubble styles', () => {
    expect(css).toMatch(/\.chat-thinking-text\s*\{/);
    expect(css).toMatch(/\.bubble-clickable\s*\{/);
  });
});
