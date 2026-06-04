const fs = require('node:fs');
const path = require('path');
const Ajv = require('ajv');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

const schema = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../../src/gameCard/game-card.schema.json'),
  'utf8'
));

function card(audio) {
  return {
    version: '1',
    id: 'audio-card',
    name: 'Audio Card',
    audio,
    rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'remove', predicate: { all: true } }] }]
  };
}

describe('game card audio schema', () => {
  test('accepts bgm resource tables', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    const config = { bgm: { intro: 'audio/intro.mp3', quiet: 'audio/quiet.ogg' } };

    expect(validate(card(config))).toBe(true);
    expect(validateGameCard(card(config))).toEqual({ valid: true, errors: [] });
  });

  test('rejects unsafe audio resource paths', () => {
    const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
    const unsafe = [
      { bgm: { intro: '../intro.mp3' } },
      { bgm: { intro: '/tmp/intro.mp3' } },
      { bgm: { intro: 'audio/intro.txt' } }
    ];

    unsafe.forEach(audio => {
      expect(validate(card(audio))).toBe(false);
      expect(validateGameCard(card(audio)).valid).toBe(false);
    });
  });
});
