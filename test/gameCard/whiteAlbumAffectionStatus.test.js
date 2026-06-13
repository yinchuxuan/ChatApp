const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema, llmStateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
function readCardFile(relativePath) { return fs.readFileSync(path.join(cardDir, relativePath), 'utf-8'); }

const fileContents = {
  'first_msg.md': readCardFile('first_msg.md'),
  'roleplay_rules.md': readCardFile('roleplay_rules.md'),
  'plot_guides.md': readCardFile('plot_guides.md'),
  'state/schema.json': JSON.stringify(stateSchema),
  'state/llm_schema.json': JSON.stringify(llmStateSchema),
  'state/state_update_rules.md': readCardFile('state/state_update_rules.md'),
  'scripts/timeline.js': readCardFile('scripts/timeline.js'),
  'worldbook/characters.md': readCardFile('worldbook/characters.md'),
  'worldbook/index.md': readCardFile('worldbook/index.md'),
  'worldbook/location.md': readCardFile('worldbook/location.md')
};

function state(overrides) {
  return ensureStateDefaults(loadedCard.state.schema, overrides).state;
}

function run(content, gameState) {
  const init = applyGameCard({ card: loadedCard, phase: 'init', messages: [], state: state({}), fileContents });
  const result = applyGameCard({
    card: loadedCard,
    phase: 'pre_send',
    messages: [...init.messages, { role: 'user', content }],
    state: gameState,
    fileContents
  });
  return {
    status: result.messages.find((msg) => msg._meta?.source === 'wa2_state_context').content,
    guide: result.messages.find((msg) => msg.role === 'user').content,
    worldbook: result.messages.find((msg) => msg._meta?.source === 'wa2_worldbook').content
  };
}

describe('white album affection status', () => {
  test('writes affection attitudes into the free plot guide', () => {
    const low = run('今天去找冬马排练', state({ touma: { affection: 12 }, setsuna: { affection: 65 } }));
    const high = run('今天去找冬马排练', state({ touma: { affection: 88 }, setsuna: { affection: 90 } }));

    expect(low.status).toContain('touma.affection: 12');
    expect(low.status).toContain('setsuna.affection: 65');
    expect(low.guide).toContain('冬马和纱当前态度');
    expect(low.guide).toContain('小木曾雪菜当前态度');
    expect(high.guide).toContain('冬马和纱当前态度');
  });

  test('keeps affection attitudes out of worldbook content', () => {
    const result = run('和冬马、雪菜一起排练', state({ touma: { affection: 88 }, setsuna: { affection: 90 } }));

    expect(result.worldbook).toContain('冬马和纱');
    expect(result.worldbook).toContain('小木曾雪菜');
    expect(result.worldbook).not.toContain('当前态度');
  });
});
