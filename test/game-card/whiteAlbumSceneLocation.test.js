const fs = require('node:fs');
const path = require('node:path');
const { card, llmStateContract, stateSchema } = require('./whiteAlbumTestCard');
const { applyStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({
  ...card,
  state: { ...card.state, schema: stateSchema }
});
const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const updateRules = fs.readFileSync(
  path.join(cardDir, 'state/state_update_rules.md'),
  'utf8'
);
const scenes = [
  'apartment', 'classroom', 'corridor', 'musical_classroom3', 'school',
  'setsuna_room', 'stairs', 'street', 'subway_station'
];
const times = ['morning', 'afternoon', 'night'];
const expectedBackgrounds = scenes.flatMap(scene => times.map(time => `${scene}_${time}`));
function contractValues(path) {
  const line = llmStateContract.split('\n').find(item => item.startsWith(`- \`${path}\``));
  return [...line.matchAll(/`([^`]+)`/g)].map(match => match[1]).slice(1);
}
const reusableBackgrounds = [...new Set(
  [...llmStateContract.matchAll(/`([a-z0-9_]+_(?:morning|afternoon|night))`/g)]
    .map(match => match[1])
)];
const reusableBgms = contractValues('audio.bgm');

describe('white album reusable presentation resources', () => {
  test('lists every reusable background in the write contract', () => {
    expect(reusableBackgrounds).toEqual(expectedBackgrounds);
  });

  test('instructs the model to select a background by place and time', () => {
    expect(llmStateContract).toContain('05:00～11:59 使用 morning');
    expect(llmStateContract).toContain('12:00～17:59 使用 afternoon');
    expect(llmStateContract).toContain('18:00～次日 04:59 使用 night');
    expect(llmStateContract).toContain('专用 CG 直接使用剧情引导给出的资源名');
    expect(updateRules).toContain('先匹配后续正文实际发生的地点');
    expect(updateRules).toContain('专用 CG 时直接使用剧情引导给出的资源名');
  });

  test('lists only the reusable bgms in the write contract', () => {
    expect(reusableBgms).toEqual([
      'daily', 'happy', 'light', 'release', 'steady', 'sad', 'tragic'
    ]);
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

  test('keeps legacy untimed aliases out of the LLM write contract', () => {
    ['musical_classroom3', 'school', 'classroom']
      .forEach(background => expect(llmStateContract).not.toContain(`\`${background}\``));
  });
});
