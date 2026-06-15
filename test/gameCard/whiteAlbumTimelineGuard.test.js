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

function runPreSend(state) {
  return applyGameCard({
    card: loadedCard,
    phase: 'pre_send',
    messages: [{ role: 'user', content: '继续' }],
    state,
    fileContents
  });
}

describe('white album timeline guard', () => {
  test('writes the current slot and slot end for the model context', () => {
    const state = ensureStateDefaults(loadedCard.state.schema, {}).state;
    const result = runPreSend(state);

    expect(result.state.timeline.currentSlot).toBe('FreePlot1');
    expect(result.state.timeline.currentSlotEnd).toBe('2007.10.21: 16:00 星期日');
    expect(result.messages.find((msg) => msg._meta?.source === 'wa2_state_context').content)
      .toContain('timeline.currentSlotEnd: 2007.10.21: 16:00 星期日');
  });

  test('clamps model-written currentTime to the previous slot end before resolving timeline', () => {
    const state = ensureStateDefaults(loadedCard.state.schema, {
      timeline: {
        currentTime: '2007.10.21: 18:30 星期日',
        currentSlotEnd: '2007.10.21: 16:00 星期日'
      }
    }).state;
    const result = runPreSend(state);

    expect(result.state.timeline.currentTime).toBe('2007.10.21: 16:00 星期日');
    expect(result.state.timeline.currentSlot).toBe('FixedPlot1');
    expect(result.state.timeline.currentSlotEnd).toBe('2007.10.21: 18:00 星期日');
    expect(result.state.temp.timelineTimeClamped).toBe(true);
    expect(result.state.temp.timelineRequestedTime).toBe('2007.10.21: 18:30 星期日');
  });
});
