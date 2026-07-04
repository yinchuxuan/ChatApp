const { applyUiStateActionEvent, normalizeUiStateActions } = require('../../src/gameCard/uiStateActions');

describe('game card ui state actions', () => {
  test('normalizes single action and action arrays', () => {
    expect(normalizeUiStateActions({
      type: 'game.state.apply',
      action: { type: 'state.set', path: 'score', value: 1 }
    })).toMatchObject({ ok: true, actions: [{ type: 'state.set', path: 'score', value: 1 }] });
    expect(normalizeUiStateActions({
      type: 'game.state.apply',
      actions: [{ type: 'state.set', path: 'score', value: 2 }]
    })).toMatchObject({ ok: true, actions: [{ type: 'state.set', path: 'score', value: 2 }] });
    expect(normalizeUiStateActions({ type: 'game.state.apply', action: { type: 'exec' } }))
      .toMatchObject({ ok: false, reason: 'unsupported_action' });
  });

  test('applies ui state actions through the card state schema', async () => {
    const api = {
      readGameCardFile: jest.fn(async (_id, filePath) => ({
        success: true,
        content: filePath === 'state/schema.json'
          ? JSON.stringify({ schema: { score: { type: 'number', min: 0, max: 10, onInvalid: 'clamp' } } })
          : '{}'
      }))
    };
    const result = await applyUiStateActionEvent({
      event: {
        type: 'game.state.apply',
        actions: [
          { type: 'state.set', path: 'score', value: 20 },
          { type: 'state.set', path: 'events.queue', value: [{ id: 'next' }] }
        ]
      },
      state: { score: 1, events: { queue: [{ id: 'first' }] } },
      messages: [],
      card: { id: 'card', stateSchema: 'state/schema.json' },
      api
    });

    expect(result.state).toEqual({ score: 10, events: { queue: [{ id: 'next' }] } });
    expect(result.trace.changedKeys).toEqual(['score', 'events.queue']);
  });
});
