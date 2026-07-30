const { card, llmStateSchema, stateSchema } = require('./whiteAlbumTestCard');
const { applyStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({
  ...card,
  state: { ...card.state, schema: stateSchema }
});

describe('white album background direction', () => {
  test.each(llmStateSchema.schema['visual.background'].values)(
    'allows the reusable background %s',
    (background) => {
      const state = ensureStateDefaults(loadedCard.state.schema, {}).state;
      const result = applyStatePatch(JSON.stringify({
        type: 'state.set',
        path: 'visual.background',
        value: background
      }), state, { schema: loadedCard.state.schema });

      expect(result.trace.applied).toBe(true);
      expect(result.state.visual.background).toBe(background);
      expect(card.visual.background[background]).toBeDefined();
    }
  );

  test('keeps fixed-only backgrounds out of the LLM schema', () => {
    const llmBackgrounds = llmStateSchema.schema['visual.background'].values;

    ['invite', 'haiku', 'touma_hand', 'agreement', 'GameEnd1', 'event1']
      .forEach(background => expect(llmBackgrounds).not.toContain(background));
  });
});
