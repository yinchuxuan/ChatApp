const { card, llmStateContract, stateSchema } = require('./whiteAlbumTestCard');
const { applyStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({
  ...card,
  state: { ...card.state, schema: stateSchema }
});
const expectedBackgrounds = [
  'musical_classroom3', 'school', 'classroom'
];
function contractValues(path) {
  const line = llmStateContract.split('\n').find(item => item.startsWith(`- \`${path}\``));
  return [...line.matchAll(/`([^`]+)`/g)].map(match => match[1]).slice(1);
}
const reusableBackgrounds = contractValues('visual.scene');
const reusableBgms = contractValues('audio.bgm');

describe('white album reusable presentation resources', () => {
  test('lists every reusable background in the write contract', () => {
    expect(reusableBackgrounds).toEqual(expectedBackgrounds);
  });

  test('lists only the reusable bgms in the write contract', () => {
    expect(reusableBgms).toEqual(['daily', 'happy', 'normal', 'sad', 'tragic']);
  });

  test.each(reusableBackgrounds)(
    'allows the reusable background %s',
    (background) => {
      const state = ensureStateDefaults(loadedCard.state.schema, {}).state;
      const result = applyStatePatch(JSON.stringify({
        type: 'state.set',
        path: 'visual.scene',
        value: background
      }), state, { schema: loadedCard.state.schema });

      expect(result.trace.applied).toBe(true);
      expect(result.state.visual.scene).toBe(background);
      expect(card.visual.background[background]).toBeDefined();
      expect(llmStateContract).toContain(`\`${background}\``);
    }
  );

  test('keeps fixed-only backgrounds out of the LLM write contract', () => {
    ['invite', 'rooftop', 'haiku', 'rooftop2', 'park', 'ktv',
      'touma_hand', 'home_party', 'agreement', 'GameEnd1', 'event1']
      .forEach(background => expect(llmStateContract).not.toContain(`\`${background}\``));
  });
});
