const fs = require('node:fs');
const path = require('path');
const Ajv = require('ajv');

const schema = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../src/gameCard/game-card.schema.json'),
  'utf8'
));

function cardWithDisplay(display) {
  return {
    version: '1',
    id: 'display-card',
    name: 'Display Card',
    rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'remove', predicate: { all: true } }] }],
    display
  };
}

describe('game card display rule schema', () => {
  test('accepts assistant regex replace rules', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    expect(validate(cardWithDisplay({
      stylesheet: 'display.css',
      assistant: [{
        stage: 'before_markdown',
        type: 'regex_replace',
        pattern: '<summary>[\\s\\S]*?<\\/summary>',
        flags: 'g',
        replace: ''
      }]
    }))).toBe(true);
  });

  test('rejects unsupported display rule fields', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    expect(validate(cardWithDisplay({
      assistant: [{ stage: 'after_markdown', type: 'regex_replace', pattern: 'x' }]
    }))).toBe(false);
    expect(validate(cardWithDisplay({
      assistant: [{ stage: 'before_markdown', type: 'regex_replace', pattern: 'x', flags: 'y' }]
    }))).toBe(false);
  });
});
