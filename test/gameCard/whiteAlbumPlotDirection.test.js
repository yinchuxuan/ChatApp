const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema, llmStateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');
const { applyLatestAssistantStatePatch } = require('../../src/gameCard/statePatch');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
function readCardFile(relativePath) { return fs.readFileSync(path.join(cardDir, relativePath), 'utf-8'); }

const fileContents = {
  'first_msg.md': readCardFile('first_msg.md'),
  'system_prompt.md': readCardFile('system_prompt.md'),
  'roleplay_rules.md': readCardFile('roleplay_rules.md'),
  'plot/chapter-1.md': readCardFile('plot/chapter-1.md'),
  'plot/chapter-2.md': readCardFile('plot/chapter-2.md'),
  'state/schema.json': JSON.stringify(stateSchema),
  'state/llm_schema.json': JSON.stringify(llmStateSchema),
  'state/state_update_rules.md': readCardFile('state/state_update_rules.md'),
  'scripts/timeline.js': readCardFile('scripts/timeline.js'),
  'scripts/timelines/chapter-1.js': readCardFile('scripts/timelines/chapter-1.js'),
  'scripts/timelines/chapter-2.js': readCardFile('scripts/timelines/chapter-2.js'),
  'worldbook/characters.md': readCardFile('worldbook/characters.md'),
  'worldbook/index.md': readCardFile('worldbook/index.md'),
  'worldbook/location.md': readCardFile('worldbook/location.md')
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
    expect(guide.content).toContain('剧情目标');
    expect(guide.content).toContain('剧情类型：自由剧情节点');
    expect(guide.content).toContain('本轮自由剧情走向: 极度正面');
    expect(guide.content).toContain('根据 State更新规则写入本轮变化');
    expect(guide.content).toContain('角色扮演规则:');
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

    expect(guide.content).toContain('绝对禁止将时间推进到 2007.10.21: 16:00 星期日 之后');
    expect(guide.content).toContain('剧情类型：自由剧情节点');

    const wall = runAtSlot('2007.10.21: 16:00 星期日');
    const wallGuide = wall.messages.find((msg) => msg.role === 'user');

    expect(wall.state.audio.bgm).toBe('WA_piano');
    expect(wallGuide.content).toContain('当前剧情时间段：2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日');
    expect(wallGuide.content).toContain('隔墙合奏');
    expect(wallGuide.content).not.toContain('本轮自由剧情走向');
    expect(wallGuide.content).not.toContain('冬马和纱当前态度');

    const free = runAtSlot('2007.10.21: 18:00 星期日');
    const freeGuide = free.messages.find((msg) => msg.role === 'user');

    expect(freeGuide.content).toContain('绝对禁止将时间推进到 2007.10.23: 10:00 星期二 之后');
    expect(freeGuide.content).toContain('剧情类型：自由剧情节点');
    expect(freeGuide.content).not.toContain('本轮必须完成该剧情节点');
    ['2007.10.21: 18:00 星期日', '2007.10.23: 12:00 星期二', '2007.10.24: 12:00 星期三'].forEach((time) => {
      const branchGuide = runAtSlot(time).messages.find((msg) => msg.role === 'user');
      expect(branchGuide.content).toContain('本轮剧情走向');
    });

    const invite = runAtSlot('2007.10.23: 08:00 星期二');
    const inviteGuide = invite.messages.find((msg) => msg.role === 'user');

    expect(invite.state.audio.bgm).toBe('normal');
    expect(inviteGuide.content).toContain('邀请小木曾雪菜');
    expect(inviteGuide.content).not.toContain('隔墙合奏');
    expect(inviteGuide.content).not.toContain('本轮自由剧情走向');

    const deadline = runAtSlot('2007.10.25: 08:00 星期四');
    const deadlineGuide = deadline.messages.find((msg) => msg.role === 'user');

    expect(deadline.state.audio.bgm).toBe('sad');
    expect(deadlineGuide.content).toContain('今天是学园祭报名节目的截止日期');
    expect(deadlineGuide.content).not.toContain('隔墙合奏');
    expect(deadlineGuide.content).not.toContain('本轮自由剧情走向');

    const rooftop = runAtSlot('2007.10.25: 16:00 星期四');
    const rooftopGuide = rooftop.messages.find((msg) => msg.role === 'user');

    expect(rooftop.state.audio.bgm).toBe('WA_3');
    expect(rooftopGuide.content).toContain('天台上响起了第三个声音');
    expect(rooftopGuide.content).not.toContain('今天是学园祭报名节目的截止日期');
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
    expect(guide.content).toContain('隔墙合奏');
  });

  test('keeps current time during fixed slots', () => {
    const result = runAtSlot('2007.10.21: 17:00 星期日');
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(result.state.timeline.currentTime).toBe('2007.10.21: 17:00 星期日');
    expect(guide.content).toContain('剧情类型：自由剧情节点');
    expect(guide.content).toContain('绝对禁止将时间推进到 2007.10.23: 10:00 星期二 之后');
    expect(guide.content).not.toContain('隔墙合奏');
  });

  test('keeps current time during free slots', () => {
    const early = runAtSlot('2007.10.23: 01:59 星期二');
    const snapped = runAtSlot('2007.10.23: 02:00 星期二');
    const guide = snapped.messages.find((msg) => msg.role === 'user');

    expect(early.state.timeline.currentTime).toBe('2007.10.23: 01:59 星期二');
    expect(snapped.state.timeline.currentTime).toBe('2007.10.23: 02:00 星期二');
    expect(guide.content).toContain('剧情类型：固定剧情节点');
    expect(guide.content).toContain('邀请小木曾雪菜');
  });
});
