const {
  cloneState,
  deleteStateValue,
  getStateValue,
  hasStateValue,
  setStateValue
} = require('../../src/gameCard/statePaths');

describe('state path tools', () => {
  test('reads nested values with dot paths', () => {
    const state = {
      player: { hp: 80, alive: true },
      route: 'alice'
    };

    expect(getStateValue(state, 'player.hp')).toBe(80);
    expect(getStateValue(state, 'player.alive')).toBe(true);
    expect(getStateValue(state, 'route')).toBe('alice');
  });

  test('reports missing paths without throwing', () => {
    const state = { player: { hp: 80 } };

    expect(getStateValue(state, 'player.mp')).toBeUndefined();
    expect(getStateValue(state, 'enemy.hp')).toBeUndefined();
    expect(getStateValue(state, '')).toBeUndefined();
    expect(hasStateValue(state, 'player.mp')).toBe(false);
    expect(hasStateValue(state, 'enemy.hp')).toBe(false);
    expect(hasStateValue(state, 'player..hp')).toBe(false);
  });

  test('detects existing paths even when the value is undefined or null', () => {
    const state = {
      player: { hp: undefined },
      memory: null
    };

    expect(hasStateValue(state, 'player.hp')).toBe(true);
    expect(hasStateValue(state, 'memory')).toBe(true);
    expect(getStateValue(state, 'memory.text')).toBeUndefined();
  });

  test('writes nested values without mutating the original state', () => {
    const original = {
      player: { hp: 80 },
      inventory: [{ id: 'key' }]
    };

    const next = setStateValue(original, 'player.hp', 60);
    const withQuest = setStateValue(next, 'quest.active', true);

    expect(next).toEqual({
      player: { hp: 60 },
      inventory: [{ id: 'key' }]
    });
    expect(withQuest).toEqual({
      player: { hp: 60 },
      inventory: [{ id: 'key' }],
      quest: { active: true }
    });
    expect(original).toEqual({
      player: { hp: 80 },
      inventory: [{ id: 'key' }]
    });
    expect(next.player).not.toBe(original.player);
    expect(next.inventory).not.toBe(original.inventory);
  });

  test('replaces non-object parent nodes when writing nested paths', () => {
    const state = {
      player: 12,
      flags: null,
      items: []
    };

    let next = setStateValue(state, 'player.hp', 100);
    next = setStateValue(next, 'flags.metBoss', true);
    next = setStateValue(next, 'items.first.id', 'key');

    expect(next).toEqual({
      player: { hp: 100 },
      flags: { metBoss: true },
      items: { first: { id: 'key' } }
    });
    expect(state).toEqual({
      player: 12,
      flags: null,
      items: []
    });
  });

  test('clones state deeply and normalizes non-object roots', () => {
    const state = { player: { hp: 80 }, flags: ['met'] };
    const cloned = cloneState(state);

    cloned.player.hp = 50;
    cloned.flags.push('boss');

    expect(state).toEqual({ player: { hp: 80 }, flags: ['met'] });
    expect(cloneState(null)).toEqual({});
    expect(cloneState([])).toEqual({});
  });

  test('invalid write paths return a clone without changing values', () => {
    const state = { player: { hp: 80 } };
    const next = setStateValue(state, 'player..hp', 10);

    expect(next).toEqual(state);
    expect(next).not.toBe(state);
    expect(next.player).not.toBe(state.player);
  });

  test('deletes nested values without mutating the original state', () => {
    const state = {
      player: { hp: 80, mp: 20 },
      temp: { lastRoll: 6 },
      route: 'alice'
    };

    const next = deleteStateValue(state, 'player.hp');
    const withoutTemp = deleteStateValue(next, 'temp.lastRoll');

    expect(next).toEqual({
      player: { mp: 20 },
      temp: { lastRoll: 6 },
      route: 'alice'
    });
    expect(withoutTemp).toEqual({
      player: { mp: 20 },
      temp: {},
      route: 'alice'
    });
    expect(state).toEqual({
      player: { hp: 80, mp: 20 },
      temp: { lastRoll: 6 },
      route: 'alice'
    });
    expect(next.player).not.toBe(state.player);
  });

  test('missing delete paths return an unchanged clone', () => {
    const state = { player: { hp: 80 }, route: 'alice' };
    const next = deleteStateValue(state, 'player.mp');
    const missingParent = deleteStateValue(state, 'enemy.hp');

    expect(next).toEqual(state);
    expect(missingParent).toEqual(state);
    expect(next).not.toBe(state);
    expect(next.player).not.toBe(state.player);
  });

  test('invalid delete paths return a clone without changing values', () => {
    const state = { player: { hp: 80 } };
    const next = deleteStateValue(state, 'player..hp');
    const missingPath = deleteStateValue(state);

    expect(next).toEqual(state);
    expect(missingPath).toEqual(state);
    expect(next).not.toBe(state);
    expect(next.player).not.toBe(state.player);
  });
});
