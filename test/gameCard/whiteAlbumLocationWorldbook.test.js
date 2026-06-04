const card = require('../../game-card-examples/white-album-2/card.json');
const stateSchema = require('../../game-card-examples/white-album-2/state/schema.json');
const llmStateSchema = require('../../game-card-examples/white-album-2/state/llm_schema.json');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });

const fileContents = {
  'first_msg.md': '开场',
  'roleplay_rules.md': '规则',
  'plot_guides.md': '# 剧情引导\n## 自由剧情\n开头窗口',
  'state/schema.json': JSON.stringify(stateSchema),
  'state/llm_schema.json': JSON.stringify(llmStateSchema),
  'worldbook/characters.md': '# 角色世界书\n## 冬马和纱\n角色：冬马和纱',
  'worldbook/location.md': [
    '# 地点世界书',
    '## 第二音乐教室', '地点：第二音乐教室',
    '## 第三音乐教室', '地点：第三音乐教室',
    '## 峰城大附属中学', '地点：峰城大附属中学',
    '## 冬马家', '地点：冬马家'
  ].join('\n')
};

function applyWithUser(content) {
  const state = ensureStateDefaults(loadedCard.state.schema, {}).state;
  const init = applyGameCard({ card: loadedCard, phase: 'init', messages: [], state, fileContents });
  return applyGameCard({
    card: loadedCard,
    phase: 'pre_send',
    messages: [...init.messages, { role: 'user', content }],
    state: init.state,
    fileContents
  });
}

describe('white album location worldbook', () => {
  test('loads location entries from location.md when places are mentioned', () => {
    const result = applyWithUser('从峰城大附属中学的第二音乐教室去第三音乐室，之后再去冬马家');
    const worldbook = result.messages.find((msg) => msg._meta?.source === 'wa2_worldbook');
    const cardText = JSON.stringify(card.rules);

    expect(result.trace.errors).toEqual([]);
    expect(cardText).toContain('worldbook/location.md##第二音乐教室');
    expect(worldbook.content).toContain('地点:');
    expect(worldbook.content).toContain('第二音乐教室: 冬马独占的音乐教室');
    expect(worldbook.content).toContain('地点：第二音乐教室');
    expect(worldbook.content).toContain('地点：第三音乐教室');
    expect(worldbook.content).toContain('地点：峰城大附属中学');
    expect(worldbook.content).toContain('地点：冬马家');
  });
});
