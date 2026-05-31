const card = require('../../game-card-examples/white-album-2/card.json');
const stateSchema = require('../../game-card-examples/white-album-2/state/schema.json');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');

const fileContents = {
  'first_msg.md': '开场',
  'roleplay_rules.md': '规则',
  'plot_guides.md': [
    '# 剧情引导',
    '## 三人初识',
    '开头窗口',
    '## 后续剧情窗口',
    '后续窗口'
  ].join('\n'),
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

  test('adds plot direction to the one-turn timeline guide before roleplay rules', () => {
    const result = runWithRandom(0.99);
    const guide = result.messages[result.messages.length - 2];
    const rules = result.messages[result.messages.length - 1];
    const userIndex = result.messages.findIndex((msg) => msg.role === 'user' && msg.content === '继续');

    expect(result.trace.errors).toEqual([]);
    expect(result.state.temp.plotDirectionRoll).toBe(100);
    expect(result.messages[userIndex - 2]._meta.source).toBe('wa2_worldbook');
    expect(result.messages[userIndex - 2].ttl).toBe(1);
    expect(result.messages[userIndex - 1]._meta.source).toBe('wa2_state_context');
    expect(result.messages[userIndex - 1].ttl).toBe(1);
    expect(guide.role).toBe('system');
    expect(guide.ttl).toBe(1);
    expect(guide._meta).toEqual({ source: 'wa2_timeline_guide', visibility: 'llm_only' });
    expect(guide.content).toContain('开头窗口');
    expect(guide.content).toContain('随机数即时影响');
    expect(guide.content).toContain('本轮剧情走向: 很好');
    expect(guide.content).toContain('难得但克制的突破');
    expect(rules._meta).toEqual({ source: 'wa2_tail_hint', visibility: 'llm_only' });
  });

  test('loads plot guidance from the current timeline time', () => {
    const opening = runWithRandom(0.5);
    const guide = opening.messages.find((msg) => msg._meta?.source === 'wa2_timeline_guide');

    expect(guide.content).toContain('当前剧情时间: 2007.10.20:下午');
    expect(guide.content).toContain('开头窗口');
    expect(guide.content).not.toContain('后续窗口');

    const laterState = ensureStateDefaults(stateSchema, {
      timeline: { currentTime: '2007.11.01:上午' }
    }).state;
    const init = applyGameCard({ card, phase: 'init', messages: [], state: laterState, fileContents });
    const later = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [...init.messages, user('继续')],
      state: init.state,
      fileContents
    });
    const laterGuide = later.messages.find((msg) => msg._meta?.source === 'wa2_timeline_guide');

    expect(laterGuide.content).toContain('当前剧情时间: 2007.11.01:上午');
    expect(laterGuide.content).toContain('当前时间暂未匹配到已实现的固定剧情窗口');
  });
});
