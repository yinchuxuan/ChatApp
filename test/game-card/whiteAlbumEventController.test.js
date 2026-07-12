const fs = require('node:fs');
const path = require('node:path');
const { runExecAction } = require('../../src/renderer/gameCard/execRunner');

const sourceFile = 'ui/event-controller.js';
const source = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2', sourceFile),
  'utf8'
);
const closedPanel = { open: false, eventId: '', returnScene: { background: null, bgm: null } };

function sampleEvent(overrides = {}) {
  return {
    id: 'sample-event',
    background: 'event1',
    bgm: 'dream',
    options: [
      { id: 'answer', effects: { 'setsuna.affection': 2, 'touma.affection': -2 } }
    ],
    ...overrides
  };
}

async function runControl(state, payload) {
  const result = await runExecAction([], state, { type: 'exec', sourceFile }, {
    card: { id: 'white-album-2' },
    event: { type: 'game.script.run', name: 'eventControl', payload },
    fileContents: { [sourceFile]: source }
  });
  return result.state;
}

function initialState(eventItem = sampleEvent()) {
  return {
    setsuna: { affection: 99 },
    touma: { affection: 1 },
    visual: { background: 'school' },
    audio: { bgm: 'daily' },
    events: { queue: [eventItem, { id: 'next-event' }], panel: closedPanel }
  };
}

describe('white album 2 event controller', () => {
  test('opens event media and restores the previous scene when closed', async () => {
    const opened = await runControl(initialState(), { action: 'open' });
    expect(opened.events.panel).toEqual({
      open: true,
      eventId: 'sample-event',
      returnScene: { background: 'school', bgm: 'daily' }
    });
    expect(opened.visual.background).toBe('event1');
    expect(opened.audio.bgm).toBe('dream');

    const closed = await runControl(opened, { action: 'close' });
    expect(closed.events.panel).toEqual(closedPanel);
    expect(closed.visual.background).toBe('school');
    expect(closed.audio.bgm).toBe('daily');
  });

  test('consumes once, clamps affection and preserves the next event', async () => {
    const opened = await runControl(initialState(), { action: 'open' });
    const consumed = await runControl(opened, {
      action: 'consume', eventId: 'sample-event', optionId: 'answer'
    });
    expect(consumed.setsuna.affection).toBe(100);
    expect(consumed.touma.affection).toBe(0);
    expect(consumed.events.queue).toEqual([{ id: 'next-event' }]);
    expect(consumed.events.panel).toEqual(closedPanel);

    const repeated = await runControl(consumed, {
      action: 'consume', eventId: 'sample-event', optionId: 'answer'
    });
    expect(repeated).toEqual(consumed);
  });

  test('handles missing event media and removes media absent from the return scene', async () => {
    const noEventMedia = initialState(sampleEvent({ background: undefined, bgm: undefined }));
    const openedWithoutMedia = await runControl(noEventMedia, { action: 'open' });
    expect(openedWithoutMedia.visual.background).toBe('school');
    expect(openedWithoutMedia.audio.bgm).toBe('daily');
    expect(await runControl(openedWithoutMedia, { action: 'close' })).toMatchObject({
      visual: { background: 'school' }, audio: { bgm: 'daily' }
    });

    const noReturnMedia = initialState();
    delete noReturnMedia.visual.background;
    delete noReturnMedia.audio.bgm;
    const reopened = await runControl(noReturnMedia, { action: 'open' });
    const restored = await runControl(reopened, { action: 'close' });
    expect(restored.visual.background).toBeUndefined();
    expect(restored.audio.bgm).toBeUndefined();
  });
});
