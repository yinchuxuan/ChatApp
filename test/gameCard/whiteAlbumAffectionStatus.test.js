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
  'plot_guides.md': [
    '# 剧情引导',
    '## 自由剧情',
    '开头窗口',
    '## 后续剧情窗口',
    '后续窗口'
  ].join('\n'),
  'state/schema.json': JSON.stringify(stateSchema),
  'state/llm_schema.json': JSON.stringify(llmStateSchema),
  'worldbook/characters.md': [
    '# 角色世界书', '## 北原春希', '春希基础',
    '## 冬马和纱', '冬马基础',
    '## 小木曾雪菜', '雪菜基础'
  ].join('\n')
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
    expect(low.guide).toContain('好感度与随机数分支');
    expect(low.guide).toContain('冬马和纱: 保持明显距离');
    expect(low.guide).toContain('小木曾雪菜: 已明显依赖春希');
    expect(high.guide).toContain('冬马和纱: 已明显在意春希');
  });

  test('keeps affection attitudes out of worldbook content', () => {
    const result = run('和冬马、雪菜一起排练', state({ touma: { affection: 88 }, setsuna: { affection: 90 } }));

    expect(result.worldbook).toContain('冬马基础');
    expect(result.worldbook).toContain('雪菜基础');
    expect(result.worldbook).not.toContain('人物态度');
    expect(result.worldbook).not.toContain('依恋强烈而压抑');
  });
});
