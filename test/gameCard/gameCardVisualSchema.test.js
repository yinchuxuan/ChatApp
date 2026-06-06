const fs = require('node:fs');
const path = require('path');
const Ajv = require('ajv');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

const schema = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../src/gameCard/game-card.schema.json'),
  'utf8'
));

function card(visual) {
  return {
    version: '1',
    id: 'visual-card',
    name: 'Visual Card',
    visual,
    rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'remove', predicate: { all: true } }] }]
  };
}

describe('game card visual schema', () => {
  test('accepts background resource tables', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    const config = {
      stylesheet: 'visual.css',
      background: { school: 'images/school.jpg', night: 'images/night.webp' }
    };

    expect(validate(card(config))).toBe(true);
    expect(validateGameCard(card(config))).toEqual({ valid: true, errors: [] });
  });

  test('rejects unsafe background resource paths', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    const unsafe = [
      { background: { school: '../school.jpg' } },
      { background: { school: '/tmp/school.jpg' } },
      { background: { school: 'images/school.txt' } }
    ];

    unsafe.forEach(visual => {
      expect(validate(card(visual))).toBe(false);
      expect(validateGameCard(card(visual)).valid).toBe(false);
    });
  });

  test('rejects unsafe visual stylesheet paths', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    const unsafe = [
      { stylesheet: '../visual.css', background: { school: 'images/school.jpg' } },
      { stylesheet: '/tmp/visual.css', background: { school: 'images/school.jpg' } },
      { stylesheet: 'visual.txt', background: { school: 'images/school.jpg' } }
    ];

    unsafe.forEach(visual => {
      expect(validate(card(visual))).toBe(false);
      expect(validateGameCard(card(visual)).valid).toBe(false);
    });
  });
});
