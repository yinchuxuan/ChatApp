const { applyGameCard } = require('../../src/gameCard/engine');
const { applyStateAction } = require('../../src/gameCard/stateActions');

function apply(state, action, schema) {
  return applyStateAction(state, action, { schema });
}

describe('state action schema validation', () => {
  test('rejects enum and number values that violate schema', () => {
    const schema = {
      route: { type: 'enum', values: ['none', 'alice'] },
      'player.hp': { type: 'number', min: 0, max: 100 }
    };
    const route = apply({ route: 'none' }, { type: 'state.set', path: 'route', value: 'bad' }, schema);
    const hp = apply({ player: { hp: 80 } }, { type: 'state.set', path: 'player.hp', value: 120 }, schema);

    expect(route.state).toEqual({ route: 'none' });
    expect(hp.state).toEqual({ player: { hp: 80 } });
    expect(route.trace).toMatchObject({ applied: false, reason: 'schema.route: must be one of enum values' });
    expect(hp.trace).toMatchObject({ applied: false, reason: 'schema.player.hp: must be <= 100' });
  });

  test('clamps number set results when schema uses onInvalid clamp', () => {
    const result = apply({ player: { hp: 80 } }, {
      type: 'state.set',
      path: 'player.hp',
      value: 120
    }, {
      'player.hp': { type: 'number', min: 0, max: 100, onInvalid: 'clamp' }
    });

    expect(result.state.player.hp).toBe(100);
    expect(result.trace).toMatchObject({
      applied: true,
      summary: { state: { changedKeys: ['player.hp'] } }
    });
  });

  test('validates array action results and allows undeclared paths', () => {
    const schema = {
      inventory: { type: 'array' },
      route: { type: 'enum', values: ['none', 'alice'] }
    };
    const inventory = apply({}, { type: 'state.append', path: 'inventory', value: { id: 'key' } }, schema);
    const badInventory = apply({}, { type: 'state.set', path: 'inventory', value: { id: 'bag' } }, schema);
    const custom = apply({}, { type: 'state.set', path: 'custom.path', value: { ok: true } }, schema);

    expect(inventory.state.inventory).toEqual([{ id: 'key' }]);
    expect(badInventory.state).toEqual({});
    expect(badInventory.trace).toMatchObject({ applied: false, reason: 'schema.inventory: must be an array' });
    expect(custom.state).toEqual({ custom: { path: { ok: true } } });
  });

  test('game card pipeline passes schema to state actions', () => {
    const card = {
      version: '1',
      id: 'schema-aware-state-actions',
      name: 'Schema Aware State Actions',
      state: { schema: { route: { type: 'enum', values: ['none', 'alice'] } } },
      rules: [{
        when: { phase: 'pre_send' },
        then: [
          { type: 'state.set', path: 'route', value: 'bad' },
          { type: 'insert', role: 'system', content: 'route={{state:route}}' }
        ]
      }]
    };

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [],
      state: { route: 'none' }
    });

    expect(result.state.route).toBe('none');
    expect(result.messages).toEqual([{ role: 'system', content: 'route=none' }]);
    expect(result.trace.rules[0].actions[0]).toMatchObject({
      applied: false,
      reason: 'schema.route: must be one of enum values'
    });
  });
});
