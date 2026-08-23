const { card, stateSchema } = require('./whiteAlbumTestCard');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { applyStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({
  ...card,
  state: { ...card.state, schema: stateSchema }
});

describe('white album state patch presentation', () => {
  test('updates background portraits and bgm through their runtime state paths', () => {
    const state = ensureStateDefaults(loadedCard.state.schema, {
      visual: { scene: 'school', portraits: { setsuna: 'sad' } },
      audio: { bgm: 'daily' }
    }).state;
    const patched = applyStatePatch(JSON.stringify([
      { type: 'state.set', path: 'visual.scene', value: 'musical_classroom3' },
      {
        type: 'state.set',
        path: 'visual.portraits',
        value: { touma: 'laugh', setsuna: 'normal' }
      },
      { type: 'state.set', path: 'audio.bgm', value: 'WA_piano' }
    ]), state, { schema: loadedCard.state.schema });

    expect(patched.trace.changedKeys).toEqual([
      'visual.scene',
      'visual.portraits',
      'audio.bgm'
    ]);
    expect(patched.state.visual).toEqual({
      scene: 'musical_classroom3',
      portraits: { touma: 'laugh', setsuna: 'normal' },
      textPanel: 'right'
    });
    expect(patched.state.audio.bgm).toBe('WA_piano');
  });

  test('inherits presentation fields omitted by a sparse patch', () => {
    const state = ensureStateDefaults(loadedCard.state.schema, {
      visual: { scene: 'classroom', portraits: { setsuna: 'sad' } },
      audio: { bgm: 'sad' }
    }).state;
    const patched = applyStatePatch(JSON.stringify([
      { type: 'state.set', path: 'visual.portraits', value: { touma: 'sad' } }
    ]), state, { schema: loadedCard.state.schema });

    expect(patched.state.visual.scene).toBe('classroom');
    expect(patched.state.visual.portraits).toEqual({ touma: 'sad' });
    expect(patched.state.audio.bgm).toBe('sad');
  });

  test('preserves the selected portrait while a cg temporarily hides it', () => {
    const state = ensureStateDefaults(loadedCard.state.schema, {
      visual: { scene: 'school', portraits: { setsuna: 'sad' } }
    }).state;
    const cg = applyStatePatch(JSON.stringify({
      'visual.scene': 'invite',
      'visual.portraits': { touma: 'laugh' }
    }), state, { schema: loadedCard.state.schema });
    const background = applyStatePatch(JSON.stringify({
      'visual.scene': 'classroom'
    }), cg.state, { schema: loadedCard.state.schema });

    expect(cg.state.visual).toMatchObject({
      scene: 'invite', portraits: { touma: 'laugh' }
    });
    expect(background.state.visual).toMatchObject({
      scene: 'classroom', portraits: { touma: 'laugh' }
    });
  });
});
