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
        content: '{{state:temp.find.items}}'
      }]
    }]
  };
}

describe('game card find schema', () => {
  test('rejects legacy object find declarations', () => {
    const validate = compileSchema();
    const card = cardWithFind({
      items: {
        predicate: { role: 'assistant', content: { regex: '<summary>' } },
        join: '\n'
      }
    });

    expect(validate(card)).toBe(false);
    expect(validateGameCard(card).errors[0]).toContain('must be a non-empty array');
  });

  test('accepts list find on rules and actions', () => {
    const validate = compileSchema();
    const card = {
      version: '1',
      id: 'find-card',
      name: 'Find Card',
      rules: [{
        when: { phase: 'pre_send' },
        find: [{
          name: 'assistantTime',
          from: { role: 'assistant', index: 'last' },
          match: { regex: '^time=(\\d+)', group: 1 },
          default: null
        }],
        then: [{
          type: 'replace',
          predicate: { role: 'system' },
          find: [{ name: 'users', from: { role: 'user' }, many: true, join: '\n' }],
          content: '{{state:temp.find.users}}'
        }]
      }]
    };

    expect(validate(card)).toBe(true);
    expect(validateGameCard(card).errors).toEqual([]);
  });

  test('rejects malformed find declarations', () => {
    const validate = compileSchema();
    const card = cardWithFind([{ name: 'items', from: { role: 'assistant' }, field: 'content' }]);

    expect(validate(card)).toBe(false);
    expect(validateGameCard(card).errors[0]).toContain('unknown find key: field');
  });

  test('rejects malformed list find declarations', () => {
    const card = cardWithFind([{
      name: 'bad',
      from: { role: 'assistant' },
      select: 'bad'
    }]);

    expect(validateGameCard(card).errors[0]).toContain('select');
  });
});
