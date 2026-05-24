const fs = require('node:fs');
const path = require('path');
const Ajv = require('ajv');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

const schemaPath = path.join(__dirname, '../../src/gameCard/game-card.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

function compileSchema() {
  return new Ajv({ allErrors: true, strict: false }).compile(schema);
}

function cardWithFind(find) {
  return {
    version: '1',
    id: 'find-card',
    name: 'Find Card',
    rules: [{
      when: { phase: 'pre_send' },
      then: [{
        type: 'replace',
        predicate: { role: 'system' },
        find,
        content: '{{find:items}}'
      }]
    }]
  };
}

describe('game card find schema', () => {
  test('accepts find on insert and replace actions', () => {
    const validate = compileSchema();
    const card = cardWithFind({
      items: {
        predicate: { role: 'assistant', content: { regex: '<summary>' } },
        join: '\n'
      }
    });

    expect(validate(card)).toBe(true);
    expect(validateGameCard(card).errors).toEqual([]);
  });

  test('rejects malformed find declarations', () => {
    const validate = compileSchema();
    const card = cardWithFind({
      items: {
        predicate: { role: 'assistant' },
        field: 'content'
      }
    });

    expect(validate(card)).toBe(false);
    expect(validateGameCard(card).errors[0]).toContain('unknown find key: field');
  });
});
