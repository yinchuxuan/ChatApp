const {
  ensureStateDefaults,
  normalizeStateSchema
} = require('../../src/gameCard/stateSchema');

describe('state schema defaults', () => {
  test('normalizes direct schema maps', () => {
    const result = normalizeStateSchema({
      'player.hp': { type: 'number', default: 100 },
      route: { type: 'enum', values: ['none', 'alice'], default: 'none' }
    });

    expect(result.errors).toEqual([]);
    expect(result.schema).toEqual({
      'player.hp': { type: 'number', default: 100 },
      route: { type: 'enum', values: ['none', 'alice'], default: 'none' }
    });
  });

  test('normalizes wrapped schema maps', () => {
    const result = normalizeStateSchema({
      schema: {
        'player.name': { type: 'string', default: 'Yuki' }
      }
    });

    expect(result).toEqual({
      schema: {
        'player.name': { type: 'string', default: 'Yuki' }
      },
      errors: []
    });
  });

  test('reports invalid schema entries without keeping them', () => {
    const result = normalizeStateSchema({
      '': { type: 'number' },
      'player..hp': { type: 'number' },
      route: { type: 'enum', values: [] },
      flag: 'bad',
      mood: { type: 'unknown' }
    });

    expect(result.schema).toEqual({});
    expect(result.errors).toEqual([
      'schema.: path must be a non-empty dot path',
      'schema.player..hp: path must be a non-empty dot path',
      'schema.route.values: enum requires non-empty values',
      'schema.flag: definition must be an object',
      'schema.mood.type: unsupported type'
    ]);
  });

  test('fills missing defaults into nested state', () => {
    const result = ensureStateDefaults({
      'player.hp': { type: 'number', default: 100 },
      'player.name': { type: 'string', default: 'Yuki' },
      route: { type: 'enum', values: ['none', 'alice'], default: 'none' },
      'flags.metBoss': { type: 'boolean', default: false }
    }, {});

    expect(result.state).toEqual({
      player: { hp: 100, name: 'Yuki' },
      route: 'none',
      flags: { metBoss: false }
    });
    expect(result.changed).toBe(true);
    expect(result.changedKeys).toEqual(['player.hp', 'player.name', 'route', 'flags.metBoss']);
    expect(result.errors).toEqual([]);
  });

  test('does not overwrite existing valid values', () => {
    const state = {
      player: { hp: 80 },
      route: 'alice'
    };

    const result = ensureStateDefaults({
      'player.hp': { type: 'number', default: 100 },
      route: { type: 'enum', values: ['none', 'alice'], default: 'none' }
    }, state);

    expect(result.state).toEqual(state);
    expect(result.state).not.toBe(state);
    expect(result.state.player).not.toBe(state.player);
    expect(result.changed).toBe(false);
    expect(result.changedKeys).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  test('validates invalid enum and number values without replacing them by default', () => {
    const result = ensureStateDefaults({
      route: { type: 'enum', values: ['none', 'alice'], default: 'none' },
      'player.hp': { type: 'number', default: 100, min: 0, max: 100 },
      'player.mp': { type: 'number', default: 10 }
    }, {
      route: 'bad',
      player: { hp: 120, mp: 'many' }
    });

    expect(result.state).toEqual({
      route: 'bad',
      player: { hp: 120, mp: 'many' }
    });
    expect(result.changed).toBe(false);
    expect(result.errors).toEqual([
      'state.route: must be one of enum values',
      'state.player.hp: must be <= 100',
      'state.player.mp: must be a finite number'
    ]);
  });

  test('clamps invalid number ranges when onInvalid is clamp', () => {
    const result = ensureStateDefaults({
      'player.hp': { type: 'number', default: 100, min: 0, max: 100, onInvalid: 'clamp' },
      'player.mp': { type: 'number', default: -5, min: 0, max: 50, onInvalid: 'clamp' }
    }, {
      player: { hp: 120 }
    });

    expect(result.state).toEqual({
      player: { hp: 100, mp: 0 }
    });
    expect(result.changed).toBe(true);
    expect(result.changedKeys).toEqual(['player.hp', 'player.mp']);
    expect(result.errors).toEqual([]);
  });

  test('skips invalid defaults and reports validation errors', () => {
    const result = ensureStateDefaults({
      route: { type: 'enum', values: ['none', 'alice'], default: 'bad' },
      'player.hp': { type: 'number', default: 'full' }
    }, {});

    expect(result.state).toEqual({});
    expect(result.changed).toBe(false);
    expect(result.errors).toEqual([
      'schema.route.default: must be one of enum values',
      'schema.player.hp.default: must be a finite number'
    ]);
  });
});
