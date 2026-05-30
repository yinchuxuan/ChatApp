const card = require('../../game-card-examples/white-album-2/card.json');
const stateSchema = require('../../game-card-examples/white-album-2/state/schema.json');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');

const fileContents = {
  'first_msg.md': '开场',
  'roleplay_rules.md': '规则',
  'state/schema.json': JSON.stringify(stateSchema),
  'worldbook/characters.md': [
    '# 角色世界书', '## 北原春希', '春希基础',
    '## 冬马和纱', '冬马基础',
    '## 小木曾雪菜', '雪菜基础'
  ].join('\n')
};

function user(content) {
  return { role: 'user', content };
}

function runWithRandom(randomValue) {
  jest.spyOn(Math, 'random').mockReturnValue(randomValue);
  const state = ensureStateDefaults(stateSchema, {}).state;
  const init = applyGameCard({ card, phase: 'init', messages: [], state, fileContents });
  return applyGameCard({
    card,
    phase: 'pre_send',
    messages: [...init.messages, user('继续')],
    state: init.state,
    fileContents
  });
}

describe('white album plot direction guide', () => {
  afterEach(() => {
    if (Math.random.mockRestore) Math.random.mockRestore();
  });

  test('adds a one-turn plot direction guide at the message tail', () => {
    const result = runWithRandom(0.99);
    const guide = result.messages[result.messages.length - 1];

    expect(result.trace.errors).toEqual([]);
    expect(result.state.temp.plotDirectionRoll).toBe(100);
    expect(guide.role).toBe('system');
    expect(guide.ttl).toBe(1);
    expect(guide._meta).toEqual({ source: 'wa2_plot_direction', visibility: 'llm_only' });
    expect(guide.content).toContain('本轮剧情走向: 很好');
    expect(guide.content).toContain('难得但克制的突破');
  });
});
