const { card, stateSchema } = require('./whiteAlbumTestCard');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { applyStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({
  ...card,
  state: { ...card.state, schema: stateSchema }
});

describe('white album state patch presentation', () => {
  test('updates background portrait and bgm through their runtime state paths', () => {
    const state = ensureStateDefaults(loadedCard.state.schema, {
      visual: { background: 'school', portrait: 'setsuna_sad' },
      audio: { bgm: 'daily' }
    }).state;
    const patched = applyStatePatch(JSON.stringify([
      { type: 'state.set', path: 'visual.background', value: 'musical_classroom3' },
      { type: 'state.set', path: 'visual.portrait', value: 'touma_happy' },
      { type: 'state.set', path: 'audio.bgm', value: 'WA_piano' }
    ]), state, { schema: loadedCard.state.schema });

    expect(patched.trace.changedKeys).toEqual([
      'visual.background',
      'visual.portrait',
      'audio.bgm'
    ]);
    expect(patched.state.visual).toEqual({
      background: 'musical_classroom3',
      portrait: 'touma_happy',
      textPanel: 'right'
    });
    expect(patched.state.audio.bgm).toBe('WA_piano');
  });

  test('inherits presentation fields omitted by a sparse patch', () => {
    const state = ensureStateDefaults(loadedCard.state.schema, {
      visual: { background: 'classroom', portrait: 'setsuna_sad' },
      audio: { bgm: 'sad' }
    }).state;
    const patched = applyStatePatch(JSON.stringify([
      { type: 'state.set', path: 'visual.portrait', value: 'touma_sad' }
    ]), state, { schema: loadedCard.state.schema });

    expect(patched.state.visual.background).toBe('classroom');
    expect(patched.state.visual.portrait).toBe('touma_sad');
    expect(patched.state.audio.bgm).toBe('sad');
  });
});
