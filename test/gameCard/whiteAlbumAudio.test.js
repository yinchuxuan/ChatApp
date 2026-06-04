const fs = require('node:fs');
const path = require('node:path');
const card = require('../../game-card-examples/white-album-2/card.json');
const stateSchema = require('../../game-card-examples/white-album-2/state/schema.json');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

describe('white album 2 audio', () => {
  test('initializes daily bgm state and maps it to WA2_daily.mp3', () => {
    const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
    const initialized = ensureStateDefaults(loadedCard.state.schema, {}).state;
    const audioPath = card.audio.bgm[initialized.audio.bgm];

    expect(validateGameCard(card)).toEqual({ valid: true, errors: [] });
    expect(stateSchema.schema['audio.bgm']).toBeUndefined();
    expect(loadedCard.state.schema.schema['audio.bgm']).toMatchObject({
      type: 'enum',
      values: ['daily', 'happy', 'normal', 'sad', 'tragic', 'WA_piano'],
      default: 'daily'
    });
    expect(initialized.audio.bgm).toBe('daily');
    expect(audioPath).toBe('audio/WA2_daily.mp3');
    expect(fs.existsSync(path.join(__dirname, '../../game-card-examples/white-album-2', audioPath))).toBe(true);
    expect(card.audio.bgm.happy).toBe('audio/WA2_happy.mp3');
    expect(card.audio.bgm.normal).toBe('audio/WA2_normal.mp3');
    expect(card.audio.bgm.sad).toBe('audio/WA2_sad.mp3');
    expect(card.audio.bgm.tragic).toBe('audio/WA2_tragic.mp3');
    expect(card.audio.bgm.WA_piano).toBe('audio/WA2_WA_piano.ogg');
  });
});
