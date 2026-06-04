const fs = require('node:fs');
const path = require('node:path');
const card = require('../../game-card-examples/white-album-2/card.json');
const stateSchema = require('../../game-card-examples/white-album-2/state/schema.json');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

describe('white album 2 audio', () => {
  test('initializes daily bgm state and maps it to WA2_daily.mp3', () => {
    const initialized = ensureStateDefaults(stateSchema, {}).state;
    const audioPath = card.audio.bgm[initialized.audio.bgm];

    expect(validateGameCard(card)).toEqual({ valid: true, errors: [] });
    expect(stateSchema.schema['audio.bgm']).toMatchObject({
      type: 'enum',
      values: ['daily'],
      default: 'daily'
    });
    expect(initialized.audio.bgm).toBe('daily');
    expect(audioPath).toBe('audio/WA2_daily.mp3');
    expect(fs.existsSync(path.join(__dirname, '../../game-card-examples/white-album-2', audioPath))).toBe(true);
  });
});
