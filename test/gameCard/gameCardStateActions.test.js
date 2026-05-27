const { applyGameCard } = require('../../src/gameCard/engine');

function cardWithRules(rules) {
  return {
    version: '1',
    id: 'state-actions-card',
    name: 'State Actions Card',
    rules
  };
}

describe('game card state action pipeline', () => {
  test('state actions keep messages unchanged and update state in action order', () => {
    const messages = [{ role: 'user', content: 'start' }];
    const result = applyGameCard({
      card: cardWithRules([{
        when: { phase: 'pre_send' },
        then: [
          { type: 'state.set', path: 'route', value: 'alice' },
          { type: 'state.append', path: 'inventory', value: { id: 'key' } },
          { type: 'state.delete', path: 'temp.lastRoll' }
        ]
      }]),
      phase: 'pre_send',
      messages,
      state: { route: 'none', temp: { lastRoll: 6 } }
    });

    expect(result.messages).toEqual(messages);
    expect(result.state).toEqual({
      route: 'alice',
      temp: {},
      inventory: [{ id: 'key' }]
    });
    expect(result.trace.rules[0].actions.map((action) => action.type)).toEqual([
      'state.set',
      'state.append',
      'state.delete'
    ]);
    expect(result.trace.rules[0].actions[0].summary.messages).toEqual({
      before: 1,
      after: 1,
      inserted: 0,
      removed: 0,
      replaced: 0
    });
  });

  test('later message actions can render state set by earlier actions in the same rule', () => {
    const result = applyGameCard({
      card: cardWithRules([{
        when: { phase: 'pre_send' },
        then: [
          { type: 'state.set', path: 'route', value: 'alice' },
          { type: 'insert', role: 'system', content: '{{raw_string:route=}} + {{state:route}}' }
        ]
      }]),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'go' }],
      state: { route: 'none' }
    });

    expect(result.messages).toEqual([
      { role: 'user', content: 'go' },
      { role: 'system', content: 'route=alice' }
    ]);
    expect(result.state.route).toBe('alice');
    expect(result.trace.rules[0].summary.state.changedKeys).toEqual(['route']);
  });

  test('later rules can match when.state against state changed by earlier rules', () => {
    const result = applyGameCard({
      card: cardWithRules([
        {
          id: 'choose-route',
          when: { phase: 'pre_send' },
          then: [{ type: 'state.set', path: 'route', value: 'alice' }]
        },
        {
          id: 'route-followup',
          when: { phase: 'pre_send', state: { route: 'alice' } },
          then: [{ type: 'insert', role: 'system', content: 'alice route active' }]
        }
      ]),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'go' }],
      state: { route: 'none' }
    });

    expect(result.messages[1]).toEqual({ role: 'system', content: 'alice route active' });
    expect(result.trace.rules.map((rule) => rule.ruleId)).toEqual([
      'choose-route',
      'route-followup'
    ]);
  });

  test('failed state actions do not block later actions', () => {
    const result = applyGameCard({
      card: cardWithRules([{
        when: { phase: 'pre_send' },
        then: [
          { type: 'state.append', path: 'inventory', value: { id: 'key' } },
          { type: 'state.remove', path: 'inventory', value: { id: 'key' } },
          { type: 'insert', role: 'system', content: '{{raw_string:items=}} + {{state_json:inventory}}' }
        ]
      }]),
      phase: 'pre_send',
      messages: [],
      state: { inventory: { id: 'bag' } }
    });

    expect(result.state).toEqual({ inventory: { id: 'bag' } });
    expect(result.messages).toEqual([{ role: 'system', content: 'items={"id":"bag"}' }]);
    expect(result.trace.rules[0].actions[0]).toMatchObject({
      type: 'state.append',
      applied: false,
      reason: 'target_not_array'
    });
  });
});
