const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
const { applyGameCard } = require('../../src/gameCard/engine');
const { compileGameCardUiRootSource } = require('../../src/gameCard/uiRuntime');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { stateSchema, llmStateSchema } = require('./whiteAlbumTestCard');

const rootSource = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/ui/root.js'),
  'utf8'
);
const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
function readCardFile(relativePath) { return fs.readFileSync(path.join(cardDir, relativePath), 'utf8'); }

function compileRoot() {
  return compileGameCardUiRootSource(rootSource, React);
}

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
      rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'exec', sourceFile: 'scripts/timeline.js' }] }]
    },
    phase: 'pre_send',
    messages: [{ role: 'user', content: '继续' }],
    state,
    fileContents: {
      'scripts/timeline.js': readCardFile('scripts/timeline.js'),
      'scripts/timelines/chapter-1.js': readCardFile('scripts/timelines/chapter-1.js'),
      'scripts/timelines/chapter-2.js': readCardFile('scripts/timelines/chapter-2.js')
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
    expect(llmStateSchema.schema['events.queue']).toBeUndefined();
    expect(llmStateSchema.schema['events.fired']).toBeUndefined();
  });

  test('renders an empty event panel from the persistent event button', () => {
    const Root = compileRoot();
    const { container } = render(React.createElement(Root, {
      React,
      state: { events: { queue: [] } },
      emit: jest.fn()
    }));
    const trigger = screen.getByRole('button', { name: '打开事件' });

    expect(container.firstChild).toHaveAttribute('data-has-events', 'false');
    expect(container.querySelector('.wa2-event-trigger-mark')).toBeNull();
    fireEvent.click(trigger);

    expect(screen.getByText('当前无事件')).toBeInTheDocument();
    expect(screen.getByText('新的剧情事件出现后，会在这里等待你的选择。')).toBeInTheDocument();
  });

  test('emits state actions to consume the first queued event option', () => {
    const Root = compileRoot();
    const emit = jest.fn(() => true);
    const state = {
      setsuna: { affection: 99 },
      touma: { affection: 1 },
      events: {
        queue: [{
          id: 'sample-event',
          title: '雪菜的答复',
          time: '2007.10.26 放学后 星期五',
          body: '雪菜答应加入同好会之后，春希可以选择如何回应她。',
          options: [
            { id: 'thank', label: '认真道谢', effects: { 'setsuna.affection': 2, 'touma.affection': -2 } },
            { id: 'light', label: '轻轻带过', effects: { 'setsuna.affection': -1 } }
          ]
        }]
      }
    };

    const { container } = render(React.createElement(Root, { React, state, emit }));
    const trigger = screen.getByRole('button', { name: '打开事件' });

    expect(container.firstChild).toHaveAttribute('data-has-events', 'true');
    expect(container.querySelector('.wa2-event-trigger-mark')).toBeNull();
    fireEvent.click(trigger);
    expect(container.querySelector('.wa2-event-panel-head')).toBeNull();
    expect(container.querySelector('.wa2-event-kicker')).toBeNull();
    expect(container.querySelector('.wa2-event-count')).toBeNull();
    expect(screen.queryByText(/队列/)).not.toBeInTheDocument();
    expect(screen.getByText('2007.10.26 放学后 星期五')).toBeInTheDocument();
    expect(container.querySelector('.wa2-event-time-icon')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '认真道谢' }));

    expect(emit).toHaveBeenCalledWith({
      type: 'game.state.apply',
      actions: [
        { type: 'state.set', path: 'setsuna.affection', value: 100 },
        { type: 'state.set', path: 'touma.affection', value: 0 },
        { type: 'state.set', path: 'events.queue', value: [] }
      ]
    });
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
      title: '脑海中的余音',
      time: '2007.10.26 星期五 晚上',
      body: '放学回家后，春希脑海中还在回忆刚才的三人合奏。萦绕在耳边的是：',
      options: [
        { id: 'piano', label: '隔壁的钢琴声', effects: { 'touma.affection': 1 } },
        { id: 'song', label: '天台的歌声', effects: { 'setsuna.affection': 1 } }
      ]
    });
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
