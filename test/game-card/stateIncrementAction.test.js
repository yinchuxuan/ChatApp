const { applyStateAction } = require('../../src/shared/game-card/state/stateActions');
const { applyStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { validateGameCard } = require('../../src/shared/game-card/schema/validateGameCard');

const schema = {
  score: { type: 'number', min: 0, max: 100, onInvalid: 'clamp' }
};

describe('state.inc', () => {
  test('adds a finite delta immutably and applies number schema clamping', () => {
    const state = { score: 98 };
    const result = applyStateAction(state, {
      type: 'state.inc', path: 'score', value: 5
    }, { schema });

    expect(result.state.score).toBe(100);
    expect(state.score).toBe(98);
    expect(result.trace).toMatchObject({
      type: 'state.inc', applied: true,
      summary: { state: { changedKeys: ['score'] } }
    });
  });

  test('rejects a missing or non-number target and an invalid delta', () => {
    const missing = applyStateAction({}, {
      type: 'state.inc', path: 'score', value: 1
    });
    const target = applyStateAction({ score: '1' }, {
      type: 'state.inc', path: 'score', value: 1
    });
    const delta = applyStateAction({ score: 1 }, {
      type: 'state.inc', path: 'score', value: '1'
    });

    expect(missing.trace.reason).toBe('target_not_number');
    expect(target.trace.reason).toBe('target_not_number');
    expect(delta.trace.reason).toBe('invalid_value');
  });

  test('records state.inc as a state patch update operation', () => {
    const result = applyStatePatch(JSON.stringify({
      type: 'state.inc', path: 'score', value: -2
    }), { score: 5 }, { schema });

    expect(result.state.score).toBe(3);
    expect(result.trace.updates).toEqual([{
      path: 'score', operation: 'state.inc', before: 5, after: 3
    }]);
  });

  test('accepts state.inc in card actions and response validation operations', () => {
    const card = {
      version: '1.0', id: 'increment', name: 'Increment',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'state.inc', path: 'score', value: 1 }]
      }],
      responseValidation: { rules: [{
        id: 'increment-only', type: 'state.update', path: 'score',
        operations: ['state.inc'], message: 'score must use state.inc'
      }] }
    };

    expect(validateGameCard(card)).toEqual({ valid: true, errors: [] });
    expect(validateGameCard({
      ...card,
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'state.inc', path: 'score', value: '1' }]
      }]
    }).valid).toBe(false);
  });
});
