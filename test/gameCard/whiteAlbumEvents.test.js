const fs = require('node:fs');
const path = require('node:path');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { stateSchema, llmStateSchema } = require('./whiteAlbumTestCard');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
function readCardFile(relativePath) { return fs.readFileSync(path.join(cardDir, relativePath), 'utf8'); }

function runTimeline(currentTime, overrides = {}) {
  const state = ensureStateDefaults(stateSchema, {
    ...overrides,
    timeline: { ...(overrides.timeline || {}), currentTime }
  }).state;
  return applyGameCard({
    card: {
      version: '1',
      id: 'white-album-2',
      name: 'WA2 Timeline',
      state: { schema: stateSchema },
      files: {
        'event.chapter2.afterFixedPlot1.rehearsalMemory':
          'events/chapter2-after-fixedplot1-rehearsal-memory.md'
      },
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'exec', sourceFile: 'scripts/timeline.js' }] }]
    },
    phase: 'pre_send',
    messages: [{ role: 'user', content: '继续' }],
    state,
    fileContents: {
      'scripts/timeline.js': readCardFile('scripts/timeline.js'),
      'scripts/timelines/chapter-1.js': readCardFile('scripts/timelines/chapter-1.js'),
      'scripts/timelines/chapter-2.js': readCardFile('scripts/timelines/chapter-2.js'),
      'events/chapter2-after-fixedplot1-rehearsal-memory.md':
        readCardFile('events/chapter2-after-fixedplot1-rehearsal-memory.md')
    }
  });
}

describe('white album 2 local events', () => {
  test('declares local-only event state', () => {
    expect(stateSchema.schema['events.queue']).toMatchObject({
      type: 'array',
      default: [],
      llmRead: false,
      llmWrite: false,
      uiVisible: true
    });
    expect(stateSchema.schema['events.fired']).toMatchObject({
      type: 'object',
      default: {},
      llmRead: false,
      llmWrite: false
    });
    expect(stateSchema.schema['events.panel']).toMatchObject({
      type: 'object',
      default: { open: false, eventId: '', returnScene: { background: null, bgm: null } },
      llmRead: false,
      llmWrite: false,
      uiVisible: true
    });
    expect(llmStateSchema.schema['events.queue']).toBeUndefined();
    expect(llmStateSchema.schema['events.fired']).toBeUndefined();
    expect(llmStateSchema.schema['events.panel']).toBeUndefined();
  });

  test('enqueues the rehearsal memory event after chapter 2 fixed plot 1 ends', () => {
    const result = runTimeline('2007.10.26: 16:30 星期五', {
      story: { progress: 'FixedPlot1' },
      events: { queue: [], fired: {} }
    });
    const eventItem = result.state.events.queue[0];

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.progress).toBe('FreePlot1');
    expect(eventItem).toMatchObject({
      id: 'chapter2_after_fixedplot1_rehearsal_memory',
      title: '事件：梦中的声音',
      time: '2007.10.25 星期五 晚上',
      background: 'event1',
      bgm: 'dream',
      options: [
        { id: 'piano', label: '隔壁的钢琴声', effects: { 'touma.affection': 1 } },
        { id: 'song', label: '天台的歌声', effects: { 'setsuna.affection': 1 } }
      ]
    });
    expect(eventItem.body).toContain('入夜后');
    expect(eventItem.body).toContain('冬马坐在靠窗的位置');
    expect(eventItem.body).toContain('神秘钢琴手');
    expect(eventItem.body).toContain('武也和依绪的笑声');
    expect(eventItem.body).toContain('只能看见一双洁白的手在光里移动');
    expect(eventItem.body).toContain('如果我唱得比钢琴更近一点');
    expect(eventItem.body).toContain('先救歌手，还是先追钢琴手');
    expect(eventItem.body).toContain('身体越过了理智的边界');
    expect(eventItem.body.length).toBeGreaterThan(2500);
    expect(eventItem.body.length).toBeLessThan(4500);
    expect(result.state.events.fired.chapter2_after_fixedplot1_rehearsal_memory).toBe(true);
  });

  test('does not enqueue the rehearsal memory event twice', () => {
    const result = runTimeline('2007.10.26: 16:30 星期五', {
      story: { progress: 'FixedPlot1' },
      events: {
        queue: [{ id: 'existing' }],
        fired: { chapter2_after_fixedplot1_rehearsal_memory: true }
      }
    });

    expect(result.state.events.queue).toEqual([{ id: 'existing' }]);
  });
});
