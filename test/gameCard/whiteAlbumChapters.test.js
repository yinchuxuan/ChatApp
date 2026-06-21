const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema, llmStateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/gameCard/engine');
const { resolveContent } = require('../../src/gameCard/contentResolver');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
function readCardFile(relativePath) { return fs.readFileSync(path.join(cardDir, relativePath), 'utf-8'); }

const fileContents = {
  'first_msg.md': '开场',
  'system_prompt.md': readCardFile('system_prompt.md'),
  'roleplay_rules.md': '规则',
  'plot/chapter-1.md': readCardFile('plot/chapter-1.md'),
  'plot/chapter-2.md': readCardFile('plot/chapter-2.md'),
  'plot/chapter-2-game-end1-afterstory.md': readCardFile('plot/chapter-2-game-end1-afterstory.md'),
  'state/schema.json': JSON.stringify(stateSchema),
  'state/llm_schema.json': JSON.stringify(llmStateSchema),
  'state/state_update_rules.md': readCardFile('state/state_update_rules.md'),
  'scripts/timeline.js': readCardFile('scripts/timeline.js'),
  'scripts/timelines/chapter-1.js': readCardFile('scripts/timelines/chapter-1.js'),
  'scripts/timelines/chapter-2.js': readCardFile('scripts/timelines/chapter-2.js'),
  'worldbook/characters.md': [
    '# 角色世界书',
    '## 冬马和纱', '角色：冬马和纱',
    '## 小木曾雪菜', '角色：小木曾雪菜'
  ].join('\n'),
  'worldbook/index.md': readCardFile('worldbook/index.md'),
  'worldbook/location.md': '# 地点世界书'
};

function runAtTime(currentTime, overrides = {}) {
  const state = ensureStateDefaults(loadedCard.state.schema, {
    ...overrides,
    timeline: { ...(overrides.timeline || {}), currentTime }
  }).state;
  const init = applyGameCard({ card: loadedCard, phase: 'init', messages: [], state, fileContents });
  return applyGameCard({
    card: loadedCard,
    phase: 'pre_send',
    messages: [...init.messages, { role: 'user', content: '继续' }],
    state: init.state,
    fileContents
  });
}

describe('white album chapters', () => {
  test('switches to chapter 2 by timeline time and reads chapter 2 plot', () => {
    const result = runAtTime('2007.10.29: 17:30 星期一', { setsuna: { affection: 10 } });
    const guide = result.messages.find((msg) => msg.role === 'user');
    const status = result.messages.find((msg) => msg._meta?.source === 'wa2_state_context');

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.chapter).toBe('chapter_2');
    expect(result.state.story.progress).toBe('FixedPlot3');
    expect(result.state.timeline.currentSlot).toBe('FixedPlot3');
    expect(result.state.temp.PlotType).toBe('FixedPlot3');
    expect(result.state.story.chapter2SetsunaBranch).toBe('secret');
    expect(result.state.temp.plotFile).toBe('plot.chapter.2');
    expect(result.state.audio.bgm).toBe('bad_woman');
    expect(status.content).not.toContain('story.chapter2SetsunaBranch');
    expect(guide.content).toContain('雪菜盛装出席和春希在KTV碰面');
    expect(guide.content).not.toContain('本轮自由剧情走向');
  });

  test('uses a reserved Setsuna branch for fixed plot 2 when affection is below 10', () => {
    const result = runAtTime('2007.10.29: 16:30 星期一', { setsuna: { affection: 9 } });
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.progress).toBe('FixedPlot2');
    expect(result.state.timeline.currentSlot).toBe('FixedPlot2');
    expect(result.state.temp.PlotType).toBe('FixedPlot2Low');
    expect(result.state.story.chapter2SetsunaBranch).toBe('reserved');
    expect(result.state.timeline.currentSlotEnd).toBe('2007.10.29: 18:00 星期一');
    expect(result.state.audio.bgm).toBe('snow_scene');
    expect(result.state.visual.background).toBe('park');
    expect(guide.content).toContain('雪菜同意加入同好会');
    expect(guide.content).not.toContain('秘密就一个都不剩');
  });

  test('uses a reserved Setsuna branch for fixed plot 3 when affection is below 10', () => {
    const result = runAtTime('2007.10.29: 17:30 星期一', { setsuna: { affection: 9 } });
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.progress).toBe('FixedPlot3');
    expect(result.state.timeline.currentSlot).toBe('FixedPlot3');
    expect(result.state.temp.PlotType).toBe('FixedPlot3Low');
    expect(result.state.temp.plotKind).toBe('free');
    expect(result.state.story.chapter2SetsunaBranch).toBe('reserved');
    expect(result.state.timeline.currentSlotEnd).toBe('2007.10.29: 22:00 星期一');
    expect(['tragic', 'sad', 'normal', 'daily', 'happy']).toContain(result.state.audio.bgm);
    expect(result.state.visual.background).toBe('park');
    expect(guide.content).toContain('剧情类型：自由剧情节点');
    expect(guide.content).toContain('剧情走向');
    expect(guide.content).not.toContain('秘密就一个都不剩');
  });

  test('loads fixed plot 3 low after the reserved branch is chosen', () => {
    const result = runAtTime('2007.10.29: 17:30 星期一', {
      setsuna: { affection: 80 },
      story: { chapter2SetsunaBranch: 'reserved' }
    });
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.progress).toBe('FixedPlot3');
    expect(result.state.timeline.currentSlot).toBe('FixedPlot3');
    expect(result.state.temp.PlotType).toBe('FixedPlot3Low');
    expect(result.state.temp.plotKind).toBe('free');
    expect(result.state.story.chapter2SetsunaBranch).toBe('reserved');
    expect(guide.content).toContain('剧情类型：自由剧情节点');
    expect(guide.content).toContain('剧情走向');
    expect(guide.content).not.toContain('雪菜盛装出席和春希在KTV碰面');
  });

  test('uses fixed plot 6 in the game end slot when both affections are high after the secret branch', () => {
    const result = runAtTime('2007.11.4: 20:30 星期日', {
      touma: { affection: 21 },
      setsuna: { affection: 21 },
      story: { chapter2SetsunaBranch: 'secret' }
    });
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.progress).toBe('GameEnd1');
    expect(result.state.timeline.currentSlot).toBe('GameEnd1');
    expect(result.state.temp.PlotType).toBe('FixedPlot6');
    expect(result.state.story.chapter2GameEnd1Reached).toBe(false);
    expect(result.state.timeline.currentSlotEnd).toBe('2007.11.4: 22:00 星期日');
    expect(result.state.audio.bgm).toBe('things');
    expect(result.state.visual.background).toBe('agreement');
    expect(guide.content).toContain('重建同好会的剧情完成');
    expect(guide.content).not.toContain('五年后的一个周五夜晚');
  });

  test('keeps game end 1 when the secret branch was not chosen', () => {
    const result = runAtTime('2007.11.4: 20:30 星期日', {
      touma: { affection: 80 },
      setsuna: { affection: 80 },
      story: { chapter2SetsunaBranch: 'reserved' }
    });
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.progress).toBe('GameEnd1');
    expect(result.state.temp.PlotType).toBe('GameEnd1');
    expect(result.state.story.chapter2GameEnd1Reached).toBe(true);
    expect(result.state.timeline.currentSlotEnd).toBe('2012.11.4: 22:00 星期五');
    expect(result.state.visual.background).toBe('GameEnd1');
    expect(guide.content).toContain('五年后的一个周五夜晚');
    expect(guide.content).not.toContain('重建同好会的剧情完成');
  });

  test('uses game end 1 afterstory free plot after game end 1 was loaded', () => {
    const result = runAtTime('2007.10.20: 15:00 星期六', {
      story: { chapter2GameEnd1Reached: true }
    });
    const guide = result.messages.find((msg) => msg.role === 'user');
    const status = result.messages.find((msg) => msg._meta?.source === 'wa2_state_context');

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.chapter).toBe('chapter_2');
    expect(result.state.story.progress).toBe('GameEnd1Afterstory');
    expect(result.state.temp.plotFile).toBe('plot.chapter.2.gameEnd1Afterstory');
    expect(result.state.temp.PlotType).toBe('GameEnd1Afterstory');
    expect(result.state.temp.plotKind).toBe('free');
    expect(result.state.timeline.currentSlotEnd).toBe('2099.12.31: 23:59 星期四');
    expect(status.content).not.toContain('story.chapter2GameEnd1Reached');
    expect(guide.content).toContain('GameEnd1 之后的日后谈');
    expect(guide.content).toContain('禁止加载或续写第二章剩余主线剧情');
    expect(guide.content).not.toContain('经过三人合奏后');
  });

  test('loads the chapter 2 first game ending guide', () => {
    const guide = resolveContent('{{file:plot.chapter.2#GameEnd1}}', {}, { card: loadedCard, fileContents });

    expect(guide).toContain('五年后的一个周五夜晚');
    expect(guide).toContain('许久没有碰过的吉他');
    expect(guide).toContain('另一个平行时空');
  });
});
