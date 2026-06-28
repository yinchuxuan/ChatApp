const fs = require('node:fs');
const path = require('path');
const Ajv = require('ajv');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

const schema = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../src/gameCard/game-card.schema.json'),
  'utf8'
));

function card(ui) {
  return {
    version: '1',
    id: 'ui-card',
    name: 'UI Card',
    ui,
    rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'remove', predicate: { all: true } }] }]
  };
}

describe('game card ui schema', () => {
  test('accepts ui stylesheet config', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    const config = {
      stylesheet: 'ui.css',
      root: {
        type: 'react',
        source: 'ui/root.js',
        style: 'ui/root.css',
        props: { label: 'A' }
      }
    };

    expect(validate(card(config))).toBe(true);
    expect(validateGameCard(card(config))).toEqual({ valid: true, errors: [] });
  });

  test('rejects unsafe ui stylesheet paths and unsupported fields', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    const unsafe = [
      { stylesheet: '../ui.css' },
      { stylesheet: '/tmp/ui.css' },
      { stylesheet: '\\ui.css' },
      { stylesheet: 'ui.txt' },
      { root: { source: '../root.js' } },
      { root: { source: 'ui/root.tsx' } },
      { root: { type: 'vue', source: 'ui/root.js' } },
      { root: { source: 'ui/root.js', style: '../root.css' } },
      { root: { source: 'ui/root.js', props: [] } }
    ];

    unsafe.forEach(ui => {
      expect(validate(card(ui))).toBe(false);
      expect(validateGameCard(card(ui)).valid).toBe(false);
    });
  });
});
