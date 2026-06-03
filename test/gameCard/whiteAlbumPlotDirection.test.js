const card = require('../../game-card-examples/white-album-2/card.json');
const stateSchema = require('../../game-card-examples/white-album-2/state/schema.json');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { applyLatestAssistantStatePatch } = require('../../src/gameCard/statePatch');

const loadedCard = { ...card, state: { ...card.state, schema: stateSchema } };

const fileContents = {
  'first_msg.md': '开场',
  'roleplay_rules.md': '规则',
  'plot_guides.md': [
    '# 剧情引导',
    '## 自由剧情',
    '通用自由节点',
    '## 2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日',
    '隔墙合奏节点',
    '## 2007.10.23: 08:00 星期二 - 2007.10.23: 12:00 星期二',
    '邀请雪菜节点',
    '## 2007.10.25: 08:00 星期四 - 2007.10.25: 12:00 星期四',
    '报名截止节点',
    '## 2007.10.25: 16:00 星期四 - 2007.10.25: 18:00 星期四',
    '天台歌声节点',
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

function assistantAt(time) {
  return { role: 'assistant', content: `【时间地点】${time} | 第三音乐教室\n剧情` };
}

function runWithRandom(randomValue) {
  jest.spyOn(Math, 'random').mockReturnValue(randomValue);
  const state = ensureStateDefaults(stateSchema, {}).state;
  return runWithState(state);
}

function runAtSlot(currentSlot) {
  const state = ensureStateDefaults(stateSchema, {
    timeline: { currentSlot }
  }).state;
  return runWithState(state);
}

function runWithState(state) {
  const init = applyGameCard({ card: loadedCard, phase: 'init', messages: [], state, fileContents });
  return applyGameCard({
    card: loadedCard,
    phase: 'pre_send',
    messages: [...init.messages, user('继续')],
    state: init.state,
    fileContents
  });
}

function runAfterAssistant(currentSlot, time) {
  const state = ensureStateDefaults(stateSchema, {
    timeline: { currentSlot }
  }).state;
  const init = applyGameCard({ card: loadedCard, phase: 'init', messages: [], state, fileContents });
  return applyGameCard({
    card: loadedCard,
    phase: 'pre_send',
    messages: [...init.messages, assistantAt(time), user('继续')],
    state: init.state,
    fileContents
  });
}

describe('white album plot direction guide', () => {
  afterEach(() => {
    if (Math.random.mockRestore) Math.random.mockRestore();
  });

  test('appends plot direction and roleplay rules to the latest user message', () => {
    const result = runWithRandom(0.99);
    const userIndex = result.messages.findIndex((msg) => msg.role === 'user');
    const guide = result.messages[userIndex];

    expect(result.trace.errors).toEqual([]);
    expect(result.state.temp.plotDirectionRoll).toBe(100);
    expect(result.messages[userIndex - 2]._meta.source).toBe('wa2_worldbook');
    expect(result.messages[userIndex - 2].ttl).toBe(1);
    expect(result.messages[userIndex - 1]._meta.source).toBe('wa2_state_context');
    expect(result.messages[userIndex - 1].ttl).toBe(1);
    expect(guide.role).toBe('user');
    expect(guide.content).toContain('继续');
    expect(guide.content).toContain('<wa2_turn_context>');
    expect(guide.content).toContain('通用自由节点');
    expect(guide.content).toContain('本轮自由剧情走向: 正反馈');
    expect(guide.content).toContain('下一时间: 2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日');
    expect(guide.content).toContain('下一轮才能描写下一时间');
    expect(guide.content).toContain('### 回复规则\n规则');
    expect(result.messages.some((msg) => msg._meta?.source === 'wa2_tail_hint')).toBe(false);
  });

  test('loads plot guidance from the current timeline time', () => {
    const opening = runWithRandom(0.5);
    const guide = opening.messages.find((msg) => msg.role === 'user');

    expect(guide.content).toContain('当前时间: 2007.10.21: 08:00 星期日 - 2007.10.21: 16:00 星期日');
    expect(guide.content).toContain('通用自由节点');
    expect(guide.content).not.toContain('后续窗口');

    const wall = runAtSlot('2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日');
    const wallGuide = wall.messages.find((msg) => msg.role === 'user');

    expect(wallGuide.content).toContain('当前时间: 2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日');
    expect(wallGuide.content).toContain('下一时间: 2007.10.21: 18:00 星期日 - 2007.10.23: 08:00 星期二');
    expect(wallGuide.content).toContain('隔墙合奏节点');

    const free = runAtSlot('2007.10.21: 18:00 星期日 - 2007.10.23: 08:00 星期二');
    const freeGuide = free.messages.find((msg) => msg.role === 'user');

    expect(freeGuide.content).toContain('当前时间: 2007.10.21: 18:00 星期日 - 2007.10.23: 08:00 星期二');
    expect(freeGuide.content).toContain('通用自由节点');
    expect(freeGuide.content).not.toContain('隔墙合奏节点');

    const invite = runAtSlot('2007.10.23: 08:00 星期二 - 2007.10.23: 12:00 星期二');
    const inviteGuide = invite.messages.find((msg) => msg.role === 'user');

    expect(inviteGuide.content).toContain('当前时间: 2007.10.23: 08:00 星期二 - 2007.10.23: 12:00 星期二');
    expect(inviteGuide.content).toContain('邀请雪菜节点');
    expect(inviteGuide.content).not.toContain('隔墙合奏节点');

    const deadline = runAtSlot('2007.10.25: 08:00 星期四 - 2007.10.25: 12:00 星期四');
    const deadlineGuide = deadline.messages.find((msg) => msg.role === 'user');

    expect(deadlineGuide.content).toContain('当前时间: 2007.10.25: 08:00 星期四 - 2007.10.25: 12:00 星期四');
    expect(deadlineGuide.content).toContain('报名截止节点');
    expect(deadlineGuide.content).not.toContain('隔墙合奏节点');

    const rooftop = runAtSlot('2007.10.25: 16:00 星期四 - 2007.10.25: 18:00 星期四');
    const rooftopGuide = rooftop.messages.find((msg) => msg.role === 'user');

    expect(rooftopGuide.content).toContain('当前时间: 2007.10.25: 16:00 星期四 - 2007.10.25: 18:00 星期四');
    expect(rooftopGuide.content).toContain('天台歌声节点');
    expect(rooftopGuide.content).not.toContain('报名截止节点');
  });

  test('llm advances the timeline slot with state.advance in state patch', () => {
    const state = ensureStateDefaults(stateSchema, {
      timeline: { currentSlot: '2007.10.21: 08:00 星期日 - 2007.10.21: 16:00 星期日' }
    }).state;
    const patched = applyLatestAssistantStatePatch([
      {
        role: 'assistant',
        content: '<state_patch>[{"type":"state.advance","path":"timeline.currentSlot"}]</state_patch>'
      }
    ], state, { schema: stateSchema });
    const result = runWithState(patched.state);
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(patched.state.timeline.currentSlot).toBe('2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日');
    expect(result.state.timeline.currentSlot).toBe('2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日');
    expect(guide.content).toContain('当前时间: 2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日');
    expect(guide.content).toContain('隔墙合奏节点');
  });

  test('auto advances fixed slots after the latest assistant has a scene time', () => {
    const result = runAfterAssistant(
      '2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日',
      '2007.10.21: 17:00 星期日'
    );
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(result.state.timeline.currentSlot).toBe('2007.10.21: 18:00 星期日 - 2007.10.23: 08:00 星期二');
    expect(guide.content).toContain('当前时间: 2007.10.21: 18:00 星期日 - 2007.10.23: 08:00 星期二');
    expect(guide.content).toContain('通用自由节点');
    expect(guide.content).not.toContain('隔墙合奏节点');
  });

  test('auto advances free slots when the latest assistant time reaches the snap point', () => {
    const early = runAfterAssistant(
      '2007.10.21: 18:00 星期日 - 2007.10.23: 08:00 星期二',
      '2007.10.23: 01:59 星期二'
    );
    const snapped = runAfterAssistant(
      '2007.10.21: 18:00 星期日 - 2007.10.23: 08:00 星期二',
      '2007.10.23: 02:00 星期二'
    );
    const guide = snapped.messages.find((msg) => msg.role === 'user');

    expect(early.state.timeline.currentSlot).toBe('2007.10.21: 18:00 星期日 - 2007.10.23: 08:00 星期二');
    expect(snapped.state.timeline.currentSlot).toBe('2007.10.23: 08:00 星期二 - 2007.10.23: 12:00 星期二');
    expect(guide.content).toContain('当前时间: 2007.10.23: 08:00 星期二 - 2007.10.23: 12:00 星期二');
    expect(guide.content).toContain('邀请雪菜节点');
  });
});
