const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/renderer/gameCard/engine');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const projectionRule = loadedCard.rules.find((rule) => rule.id === 'wa2-response-visual');
const projectionCard = { ...loadedCard, rules: [projectionRule] };
const fileContents = {
  'scripts/stream-preview.js': fs.readFileSync(
    path.join(cardDir, 'scripts/stream-preview.js'),
    'utf8'
  )
};

function projectLocation(location, overrides = {}) {
  const state = ensureStateDefaults(loadedCard.state.schema, {
    temp: { plotKind: 'free' },
    scene: { location },
    ...overrides
  }).state;
  return applyGameCard({
    card: projectionCard,
    phase: 'after_response',
    messages: [{ role: 'assistant', content: '正文' }],
    state,
    fileContents
  });
}

describe('white album committed scene projection', () => {
  test.each([
    ['school', 'school'],
    ['classroom', 'classroom'],
    ['third_music_room', 'musical_classroom3']
  ])('maps %s to the matching background', (location, background) => {
    const result = projectLocation(location);

    expect(result.trace.errors).toEqual([]);
    expect(result.state.visual.background).toBe(background);
  });

  test('does not override fixed plot visuals', () => {
    const result = projectLocation('classroom', {
      temp: { plotKind: 'fixed' },
      visual: { background: 'musical_classroom3' }
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.state.visual.background).toBe('musical_classroom3');
  });
});
