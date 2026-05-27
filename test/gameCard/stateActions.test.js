const { applyStateAction } = require('../../src/gameCard/stateActions');

describe('state action runtime', () => {
  test('state.set creates and replaces nested values immutably', () => {
    const state = { player: { hp: 80 }, route: 'none' };
    const result = applyStateAction(state, {
      type: 'state.set',
      path: 'player.hp',
      value: 60
    }, {
      messageCount: 2
    });
    const created = applyStateAction(result.state, {
      type: 'state.set',
      path: 'flags.metBoss',
      value: true
    });

    expect(result.state).toEqual({ player: { hp: 60 }, route: 'none' });
    expect(created.state.flags.metBoss).toBe(true);
    expect(state).toEqual({ player: { hp: 80 }, route: 'none' });
    expect(result.state.player).not.toBe(state.player);
    expect(result.trace).toMatchObject({
      type: 'state.set',
      applied: true,
      matched: 1,
      summary: {
        messages: { before: 2, after: 2, inserted: 0, removed: 0, replaced: 0 },
        state: { changedKeys: ['player.hp'] }
      }
    });
  });

  test('state.set deep clones object and array values', () => {
    const value = [{ id: 'key', tags: ['quest'] }];
    const result = applyStateAction({}, {
      type: 'state.set',
      path: 'inventory',
      value
    });

    value[0].tags.push('mutated');

    expect(result.state.inventory).toEqual([{ id: 'key', tags: ['quest'] }]);
    expect(result.state.inventory).not.toBe(value);
    expect(result.state.inventory[0]).not.toBe(value[0]);
  });

  test('state.delete removes nested values and keeps empty parents', () => {
    const state = { temp: { lastRoll: 6 }, route: 'alice' };
    const result = applyStateAction(state, {
      type: 'state.delete',
      path: 'temp.lastRoll'
    });

    expect(result.state).toEqual({ temp: {}, route: 'alice' });
    expect(state.temp.lastRoll).toBe(6);
    expect(result.trace.summary.state.changedKeys).toEqual(['temp.lastRoll']);
  });

  test('delete and remove missing paths are successful no-ops', () => {
    const state = { player: { hp: 80 } };
    const deleted = applyStateAction(state, {
      type: 'state.delete',
      path: 'player.mp'
    });
    const removed = applyStateAction(state, {
      type: 'state.remove',
      path: 'inventory',
      value: { id: 'key' }
    });

    expect(deleted.state).toEqual(state);
    expect(removed.state).toEqual(state);
    expect(deleted.trace.applied).toBe(true);
    expect(removed.trace.summary.state.changedKeys).toEqual([]);
  });

  test('state.append creates arrays or appends to existing arrays', () => {
    const created = applyStateAction({}, {
      type: 'state.append',
      path: 'inventory',
      value: { id: 'key' }
    });
    const appended = applyStateAction(created.state, {
      type: 'state.append',
      path: 'inventory',
      value: { id: 'coin' }
    });

    expect(created.state).toEqual({ inventory: [{ id: 'key' }] });
    expect(appended.state.inventory).toEqual([{ id: 'key' }, { id: 'coin' }]);
    expect(created.state.inventory).toEqual([{ id: 'key' }]);
    expect(appended.trace.summary.state.changedKeys).toEqual(['inventory']);
  });

  test('state.remove removes deeply equal array values', () => {
    const state = {
      inventory: [{ id: 'key', tags: ['quest'] }, { id: 'coin' }, { id: 'key', tags: ['quest'] }]
    };
    const result = applyStateAction(state, {
      type: 'state.remove',
      path: 'inventory',
      value: { tags: ['quest'], id: 'key' }
    });

    expect(result.state.inventory).toEqual([{ id: 'coin' }]);
    expect(state.inventory).toHaveLength(3);
    expect(result.trace.summary.state.changedKeys).toEqual(['inventory']);
  });

  test('array actions fail without changing non-array targets', () => {
    const state = { inventory: { id: 'bag' } };
    const appended = applyStateAction(state, {
      type: 'state.append',
      path: 'inventory',
      value: { id: 'key' }
    });
    const removed = applyStateAction(state, {
      type: 'state.remove',
      path: 'inventory',
      value: { id: 'bag' }
    });

    expect(appended.state).toEqual(state);
    expect(removed.state).toEqual(state);
    expect(appended.trace).toMatchObject({ applied: false, reason: 'target_not_array' });
    expect(removed.trace.summary.state.changedKeys).toEqual([]);
  });

  test('invalid paths and values fail without changing state', () => {
    const state = { player: { hp: 80 }, inventory: [] };
    const invalidPath = applyStateAction(state, {
      type: 'state.set',
      path: 'inventory[0]',
      value: { id: 'key' }
    });
    const missingValue = applyStateAction(state, {
      type: 'state.append',
      path: 'inventory'
    });

    expect(invalidPath.state).toEqual(state);
    expect(missingValue.state).toEqual(state);
    expect(invalidPath.trace).toMatchObject({ applied: false, reason: 'invalid_path' });
    expect(missingValue.trace).toMatchObject({ applied: false, reason: 'invalid_value' });
  });

  test('unknown state action fails with trace', () => {
    const result = applyStateAction({ route: 'none' }, {
      type: 'state.merge',
      path: 'route',
      value: 'alice'
    });

    expect(result.state).toEqual({ route: 'none' });
    expect(result.trace).toMatchObject({
      type: 'state.merge',
      applied: false,
      reason: 'not_implemented',
      summary: { state: { changedKeys: [] } }
    });
  });
});
