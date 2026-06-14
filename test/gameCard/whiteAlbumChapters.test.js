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
  'first_msg.md': '开场',
  'roleplay_rules.md': '规则',
  'plot/chapter-1.md': readCardFile('plot/chapter-1.md'),
  'plot/chapter-2.md': readCardFile('plot/chapter-2.md'),
  'state/schema.json': JSON.stringify(stateSchema),
  'state/llm_schema.json': JSON.stringify(llmStateSchema),
  'state/state_update_rules.md': readCardFile('state/state_update_rules.md'),
  'scripts/timeline.js': readCardFile('scripts/timeline.js'),
  'scripts/timelines/chapter-1.js': readCardFile('scripts/timelines/chapter-1.js'),
  'scripts/timelines/chapter-2.js': readCardFile('scripts/timelines/chapter-2.js'),
  'worldbook/characters.md': '# 角色世界书',
  'worldbook/index.md': readCardFile('worldbook/index.md'),
  'worldbook/location.md': '# 地点世界书'
};

function runAtTime(currentTime) {
  const state = ensureStateDefaults(loadedCard.state.schema, { timeline: { currentTime } }).state;
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
    const result = runAtTime('2007.10.29: 19:30 星期一');
    const guide = result.messages.find((msg) => msg.role === 'user');

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.chapter).toBe('chapter_2');
    expect(result.state.story.progress).toBe('FixedPlot3');
    expect(result.state.temp.plotFile).toBe('plot.chapter.2');
    expect(result.state.audio.bgm).toBe('happy');
    expect(guide.content).toContain('雪菜盛装出席和春希在KTV碰面');
    expect(guide.content).not.toContain('本轮自由剧情走向');
  });
});
