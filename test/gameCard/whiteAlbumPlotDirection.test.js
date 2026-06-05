const { card, stateSchema, llmStateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');
const { applyLatestAssistantStatePatch } = require('../../src/gameCard/statePatch');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });

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
  'state/llm_schema.json': JSON.stringify(llmStateSchema),
  'worldbook/characters.md': [
    '# 角色世界书', '## 北原春希', '春希基础',
    '## 冬马和纱', '冬马基础',
    '## 小木曾雪菜', '雪菜基础'
  ].join('\n')
};

function user(content) { return { role: 'user', content }; }

function runWithRandom(randomValue) {
  jest.spyOn(Math, 'random').mockReturnValue(randomValue);
  const state = ensureStateDefaults(loadedCard.state.schema, {}).state;
  return runWithState(state);
}

function runAtSlot(currentTime) {
  const state = ensureStateDefaults(loadedCard.state.schema, {
    timeline: { currentTime }
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

describe('white album plot direction guide', () => {
  afterEach(() => Math.random.mockRestore && Math.random.mockRestore());

  test('appends plot direction and roleplay rules to the latest user message', () => {
    const result = runWithRandom(0.99);
    const userIndex = result.messages.findIndex((msg) => msg.role === 'user');
    const guide = result.messages[userIndex];

    expect(result.trace.errors).toEqual([]);
    expect(result.state.temp.plotDirectionRoll).toBe(100);
    expect(result.state.audio.bgm).toBe('happy');
    expect(result.messages[userIndex - 2]._meta.source).toBe('wa2_worldbook');
    expect(result.messages[userIndex - 2].ttl).toBe(1);
    expect(result.messages[userIndex - 1]._meta.source).toBe('wa2_state_context');
    expect(result.messages[userIndex - 1].ttl).toBe(1);
    expect(guide.role).toBe('user');
    expect(guide.content).toContain('继续');
    expect(guide.content).toContain('<wa2_turn_context>');
    expect(guide.content).toContain('通用自由节点');
    expect(guide.content).toContain('本轮自由剧情走向: 极度正面');
    expect(guide.content).toContain('下一时间: 2007.10.21: 16:00 星期日');
    expect(guide.content).toContain('每轮结尾必须用 state.set 写 timeline.currentTime');
    expect(guide.content).toContain('### 回复规则\n规则');
    expect(result.messages.some((msg) => msg._meta?.source === 'wa2_tail_hint')).toBe(false);
  });

  test('sets bgm from the plot direction roll', () => {
    expect(runWithRandom(0.09).state.audio.bgm).toBe('tragic');
    expect(runWithRandom(0.28).state.audio.bgm).toBe('sad');
    expect(runWithRandom(0.291).state.audio.bgm).toBe('normal');
    expect(runWithRandom(0.691).state.audio.bgm).toBe('daily');
    expect(runWithRandom(0.891).state.audio.bgm).toBe('happy');
  });

  test('loads plot guidance from the current timeline time', () => {
    const opening = runWithRandom(0.5);
    const guide = opening.messages.find((msg) => msg.role === 'user');

    expect(guide.content).toContain('当前时间: 2007.10.21: 08:00 星期日');
    expect(guide.content).toContain('通用自由节点');
    expect(guide.content).not.toContain('后续窗口');

    const wall = runAtSlot('2007.10.21: 16:00 星期日');
    const wallGuide = wall.messages.find((msg) => msg.role === 'user');

    expect(wall.state.audio.bgm).toBe('WA_piano');
    expect(wallGuide.content).toContain('当前时间: 2007.10.21: 16:00 星期日');
    expect(wallGuide.content).toContain('下一时间: 2007.10.21: 18:00 星期日');
    expect(wallGuide.content).toContain('隔墙合奏节点');
    expect(wallGuide.content).not.toContain('好感度与随机数分支');
    expect(wallGuide.content).not.toContain('本轮自由剧情走向');
    expect(wallGuide.content).not.toContain('冬马和纱:');
    expect(wallGuide.content).not.toContain('小木曾雪菜:');

    const free = runAtSlot('2007.10.21: 18:00 星期日');
    const freeGuide = free.messages.find((msg) => msg.role === 'user');

    expect(freeGuide.content).toContain('当前时间: 2007.10.21: 18:00 星期日');
    expect(freeGuide.content).toContain('通用自由节点');
    expect(freeGuide.content).not.toContain('隔墙合奏节点');
    ['2007.10.21: 18:00 星期日', '2007.10.23: 12:00 星期二', '2007.10.25: 12:00 星期四'].forEach((time) => {
      const branchGuide = runAtSlot(time).messages.find((msg) => msg.role === 'user');
      expect(branchGuide.content).toContain('好感度与随机数分支');
      expect(branchGuide.content).toContain('本轮自由剧情走向');
    });

    const invite = runAtSlot('2007.10.23: 08:00 星期二');
    const inviteGuide = invite.messages.find((msg) => msg.role === 'user');

    expect(invite.state.audio.bgm).toBe('normal');
    expect(inviteGuide.content).toContain('当前时间: 2007.10.23: 08:00 星期二');
    expect(inviteGuide.content).toContain('邀请雪菜节点');
    expect(inviteGuide.content).not.toContain('隔墙合奏节点');
    expect(inviteGuide.content).not.toContain('好感度与随机数分支');
    expect(inviteGuide.content).not.toContain('本轮自由剧情走向');

    const deadline = runAtSlot('2007.10.25: 08:00 星期四');
    const deadlineGuide = deadline.messages.find((msg) => msg.role === 'user');

    expect(deadline.state.audio.bgm).toBe('sad');
    expect(deadlineGuide.content).toContain('当前时间: 2007.10.25: 08:00 星期四');
    expect(deadlineGuide.content).toContain('报名截止节点');
    expect(deadlineGuide.content).not.toContain('隔墙合奏节点');
    expect(deadlineGuide.content).not.toContain('好感度与随机数分支');
    expect(deadlineGuide.content).not.toContain('本轮自由剧情走向');

    const rooftop = runAtSlot('2007.10.25: 16:00 星期四');
    const rooftopGuide = rooftop.messages.find((msg) => msg.role === 'user');

    expect(rooftop.state.audio.bgm).toBe('WA_3');
    expect(rooftopGuide.content).toContain('当前时间: 2007.10.25: 16:00 星期四');
    expect(rooftopGuide.content).toContain('天台歌声节点');
    expect(rooftopGuide.content).not.toContain('报名截止节点');
    expect(rooftopGuide.content).not.toContain('好感度与随机数分支');
    expect(rooftopGuide.content).not.toContain('本轮自由剧情走向');
  });

  test('llm updates the timeline time with state.set in state patch', () => {
    const state = ensureStateDefaults(loadedCard.state.schema, {
      timeline: { currentTime: '2007.10.21: 08:00 星期日' }
    }).state;
    const patched = applyLatestAssistantStatePatch([
      {
        role: 'assistant',
        content: '<state_patch>[{"type":"state.set","path":"timeline.currentTime","value":"2007.10.21: 16:00 星期日"}]</state_patch>'
      }
    ], state, { schema: loadedCard.state.schema });
    const result = runWithState(patched.state);
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(patched.state.timeline.currentTime).toBe('2007.10.21: 16:00 星期日');
    expect(result.state.timeline.currentTime).toBe('2007.10.21: 16:00 星期日');
    expect(guide.content).toContain('当前时间: 2007.10.21: 16:00 星期日');
    expect(guide.content).toContain('隔墙合奏节点');
  });

  test('auto advances fixed slots from current time', () => {
    const result = runAtSlot('2007.10.21: 17:00 星期日');
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(result.state.timeline.currentTime).toBe('2007.10.21: 18:00 星期日');
    expect(guide.content).toContain('当前时间: 2007.10.21: 18:00 星期日');
    expect(guide.content).toContain('通用自由节点');
    expect(guide.content).not.toContain('隔墙合奏节点');
  });

  test('auto advances free slots when the latest assistant time reaches the snap point', () => {
    const early = runAtSlot('2007.10.23: 01:59 星期二');
    const snapped = runAtSlot('2007.10.23: 02:00 星期二');
    const guide = snapped.messages.find((msg) => msg.role === 'user');

    expect(early.state.timeline.currentTime).toBe('2007.10.23: 01:59 星期二');
    expect(snapped.state.timeline.currentTime).toBe('2007.10.23: 08:00 星期二');
    expect(guide.content).toContain('当前时间: 2007.10.23: 08:00 星期二');
    expect(guide.content).toContain('邀请雪菜节点');
  });
});
