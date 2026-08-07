const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema, llmStateContract } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/renderer/gameCard/engine');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const readCardFile = relativePath => fs.readFileSync(path.join(cardDir, relativePath), 'utf-8');
const fileContents = {
  'first_msg.md': '开场',
  'roleplay_rules.md': '规则',
  'plot/chapter-1.md': readCardFile('plot/chapter-1.md'),
  'plot/chapter-2.md': readCardFile('plot/chapter-2.md'),
  'plot/chapter-2-game-end1-afterstory.md': readCardFile('plot/chapter-2-game-end1-afterstory.md'),
  'plot/chapter-2-success-afterstory.md': readCardFile('plot/chapter-2-success-afterstory.md'),
  'state/schema.json': JSON.stringify(stateSchema),
  'state/llm_schema.md': llmStateContract,
  'state/state_update_rules.md': readCardFile('state/state_update_rules.md'),
  'scripts/timeline.js': readCardFile('scripts/timeline.js'),
  'scripts/timelines/chapter-1.js': readCardFile('scripts/timelines/chapter-1.js'),
  'scripts/timelines/chapter-2.js': readCardFile('scripts/timelines/chapter-2.js'),
  'worldbook/characters.md': readCardFile('worldbook/characters.md'),
  'worldbook/index.md': readCardFile('worldbook/index.md'),
  'worldbook/location.md': readCardFile('worldbook/location.md')
};

function runAtTime(currentTime, overrides = {}) {
  const state = ensureStateDefaults(loadedCard.state.schema, {
    ...overrides,
    timeline: { ...(overrides.timeline || {}), currentTime }
  }).state;
  return applyGameCard({
    card: loadedCard,
    phase: 'pre_send',
    messages: [{ role: 'user', content: '继续' }],
    state,
    fileContents
  });
}

describe('white album timeline transitions', () => {
  test.each([
    ['2007.10.24: 16:00 星期三', 'chapter_1', 'FixedPlot4'],
    ['2007.10.24: 17:30 星期三', 'chapter_2', 'FixedPlot1'],
    ['2007.10.30: 17:30 星期二', 'chapter_2', 'FixedPlot5'],
    ['2007.10.30: 19:30 星期二', 'chapter_2', 'FreePlot3'],
    ['2007.10.31: 16:00 星期三', 'chapter_2', 'FreePlot3'],
    ['2007.11.2: 20:00 星期五', 'chapter_2', 'FixedPlot6']
  ])('resolves %s to %s %s', (currentTime, chapter, plotType) => {
    const result = runAtTime(currentTime);

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.chapter).toBe(chapter);
    expect(result.state.temp.PlotType).toBe(plotType);
  });

  test('loads FreePlot3 without leaking the preceding fixed plot', () => {
    const result = runAtTime('2007.10.31: 17:30 星期三');
    const guide = result.messages.find(message => message.role === 'user');

    expect(result.state.temp.PlotType).toBe('FreePlot3');
    expect(guide.content).toContain('绝对禁止将时间推进到 2007.11.2: 21:00 星期五 之后');
    expect(guide.content).not.toContain('晚上春希等雪菜下班一同回家');
  });

  test('enters the success afterstory after FixedPlot7', () => {
    const ending = runAtTime('2007.11.4: 20:30 星期日', {
      touma: { affection: 15 },
      setsuna: { affection: 15 },
      performance: { proficiency: 20 },
      story: { chapter2SetsunaBranch: 'secret' }
    });
    const afterstory = runAtTime('2007.11.4: 22:00 星期日', ending.state);
    const guide = afterstory.messages.find(message => message.role === 'user');

    expect(ending.state.temp.PlotType).toBe('FixedPlot7');
    expect(ending.state.story.chapter2SuccessReached).toBe(true);
    expect(afterstory.state.timeline.currentSlot).toBe('Chapter2SuccessAfterstory');
    expect(afterstory.state.temp.PlotType).toBe('Chapter2SuccessAfterstory');
    expect(guide.content).toContain('轻音乐同好会已经成功重建');
    expect(guide.content).not.toContain('和雪菜在天台上开始聊天');
  });
});
