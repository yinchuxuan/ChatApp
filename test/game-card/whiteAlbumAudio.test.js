const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema } = require('./whiteAlbumTestCard');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');
const { validateGameCard } = require('../../src/shared/game-card/schema/validateGameCard');

describe('white album 2 audio', () => {
  test('initializes daily bgm state and maps it to WA2_daily.mp3', () => {
    const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
    const initialized = ensureStateDefaults(loadedCard.state.schema, {}).state;
    const audioPath = card.audio.bgm[initialized.audio.bgm];

    expect(validateGameCard(card)).toEqual({ valid: true, errors: [] });
    expect(stateSchema.schema['audio.bgm']).toBeDefined();
    expect(loadedCard.state.schema.schema['audio.bgm']).toMatchObject({
      type: 'enum',
      values: [
        'none', 'daily', 'happy', 'light', 'hope', 'release', 'peace',
        'steady', 'desolate', 'sad', 'tragic', 'WA_piano', 'WA_3', 'dream',
        'snow_scene', 'bad_woman', 'after_all_piano', 'winter_night',
        'things', 'unstoppable_dream', 'love_dream', 'WA_formal', 'normal_ex'
      ],
      default: 'daily'
    });
    expect(initialized.audio.bgm).toBe('daily');
    expect(audioPath).toBe('audio/bgm/common/WA2_daily.mp3');
    expect(fs.existsSync(path.join(__dirname, '../../game-card-examples/white-album-2', audioPath))).toBe(true);
    expect(card.audio.bgm.happy).toBe('audio/bgm/common/WA2_happy.mp3');
    expect(card.audio.bgm.light).toBe('audio/bgm/common/WA2_light.mp3');
    expect(card.audio.bgm.hope).toBe('audio/bgm/common/WA2_hope.mp3');
    expect(card.audio.bgm.release).toBe('audio/bgm/common/WA2_release.mp3');
    expect(card.audio.bgm.peace).toBe('audio/bgm/common/WA2_peace.mp3');
    expect(card.audio.bgm.steady).toBe('audio/bgm/common/WA2_steady.mp3');
    expect(card.audio.bgm.desolate).toBe('audio/bgm/common/WA2_desolate.mp3');
    expect(card.audio.bgm.sad).toBe('audio/bgm/common/WA2_sad.mp3');
    expect(card.audio.bgm.tragic).toBe('audio/bgm/common/WA2_tragic.mp3');
    expect(card.audio.bgm.WA_piano).toBe('audio/bgm/story/WA2_WA_piano.ogg');
    expect(card.audio.bgm.WA_3).toBe('audio/bgm/story/WA2_WA_3.mp3');
    expect(card.audio.bgm.dream).toBe('audio/bgm/story/WA2_dream.ogg');
    expect(card.audio.bgm.snow_scene).toBe('audio/bgm/story/WA2_snow_scene.ogg');
    expect(card.audio.bgm.bad_woman).toBe('audio/bgm/story/WA2_bad_woman.mp3');
    expect(card.audio.bgm.after_all_piano).toBe('audio/bgm/story/WA2_after_all_piano.mp3');
    expect(card.audio.bgm.winter_night).toBe('audio/bgm/story/WA2_winter_night.ogg');
    expect(card.audio.bgm.things).toBe('audio/bgm/story/WA2_things.mp3');
    expect(card.audio.bgm.unstoppable_dream).toBe('audio/bgm/story/WA2_unstoppable_dream.mp3');
    expect(card.audio.bgm.love_dream).toBe('audio/bgm/story/WA2_love_dream.ogg');
    expect(card.audio.bgm.WA_formal).toBe('audio/bgm/story/WA2_WA_formal.mp3');
    expect(card.audio.bgm.normal_ex).toBe('audio/bgm/story/WA2_normal_ex.ogg');
    for (const key of ['hope', 'desolate', 'peace']) {
      expect(fs.existsSync(path.join(__dirname, '../../game-card-examples/white-album-2', card.audio.bgm[key])))
        .toBe(true);
    }
  });

  test('exposes the new common bgm keys to the model', () => {
    const contract = fs.readFileSync(path.join(
      __dirname, '../../game-card-examples/white-album-2/state/llm_schema.md'
    ), 'utf-8');

    expect(contract).toContain('`hope`（希望初现）');
    expect(contract).toContain('`desolate`（心境凄凉）');
    expect(contract).toContain('`peace`（平静安宁）');
  });

  test('uses the registered steady key in model-facing examples', () => {
    const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
    const firstMessage = fs.readFileSync(path.join(cardDir, 'first_msg.md'), 'utf-8');
    const updateRules = fs.readFileSync(path.join(cardDir, 'state/state_update_rules.md'), 'utf-8');

    expect(firstMessage).toContain('"audio.bgm":"steady"');
    expect(updateRules).toContain('"audio.bgm":"steady"');
    expect(`${firstMessage}\n${updateRules}`).not.toContain('"audio.bgm":"normal"');
  });
});
