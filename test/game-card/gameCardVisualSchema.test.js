const fs = require('node:fs');
const path = require('path');
const Ajv = require('ajv');
const { validateGameCard } = require('../../src/shared/game-card/schema/validateGameCard');

const schema = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../src/shared/game-card/schema/game-card.schema.json'),
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
  test('accepts background, cg and portrait resource tables', () => {
    const validate = new Ajv({ $data: true, allErrors: true, strict: false }).compile(schema);
    const config = {
      stylesheet: 'visual.css',
      background: { school: 'images/school.jpg', night: 'images/night.webp' },
      cg: { confession: 'images/confession.webp' },
      portrait: {
        touma: { normal: 'images/touma.png' },
        setsuna: { happy: 'images/setsuna.webp' }
      }
    };

    expect(validate(card(config))).toBe(true);
    expect(validateGameCard(card(config))).toEqual({ valid: true, errors: [] });
  });

  test('rejects unsafe portrait resource paths and the reserved none key', () => {
    const validate = new Ajv({ $data: true, allErrors: true, strict: false }).compile(schema);
    const unsafe = [
      { portrait: { touma: { normal: '../touma.png' } } },
      { portrait: { touma: { normal: '/tmp/touma.png' } } },
      { portrait: { touma: { normal: 'images/touma.txt' } } },
      { portrait: { none: { normal: 'images/empty.png' } } },
      { portrait: { touma: { none: 'images/empty.png' } } },
      { portrait: { touma: {} } }
    ];

    unsafe.forEach(visual => {
      expect(validate(card(visual))).toBe(false);
      expect(validateGameCard(card(visual)).valid).toBe(false);
    });
  });

  test('rejects unsafe background resource paths', () => {
    const validate = new Ajv({ $data: true, allErrors: true, strict: false }).compile(schema);
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

  test('rejects unsafe cg paths and duplicate scene keys', () => {
    const validate = new Ajv({ $data: true, allErrors: true, strict: false }).compile(schema);
    expect(validate(card({ cg: { confession: '../confession.jpg' } }))).toBe(false);
    expect(validateGameCard(card({
      background: { school: 'images/school.jpg' },
      cg: { school: 'images/school-cg.jpg' }
    }))).toEqual({
      valid: false,
      errors: ['visual.cg.school: key duplicates visual.background.school']
    });
  });

  test('rejects unsafe visual stylesheet paths', () => {
    const validate = new Ajv({ $data: true, allErrors: true, strict: false }).compile(schema);
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
