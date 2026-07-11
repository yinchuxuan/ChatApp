const { validateGameCard } = require('../../shared/game-card/schema/validateGameCard');

function cardWithAction(action) {
  return {
    version: '1',
    id: 'state-action-validator',
    name: 'State Action Validator',
    rules: [{ when: { phase: 'pre_send' }, then: [action] }]
  };
}

function errorsFor(action) {
  return validateGameCard(cardWithAction(action)).errors;
}

describe('state action validation', () => {
  test('accepts valid state actions', () => {
    const actions = [
      { type: 'state.set', path: 'route', value: 'alice' },
      { type: 'state.delete', path: 'temp.lastRoll' },
      { type: 'state.append', path: 'inventory', value: { id: 'key' } },
      { type: 'state.remove', path: 'inventory', value: { id: 'key' } },
      { type: 'state.roll', path: 'temp.roll', dice: '1d6' },
      { type: 'state.randomInt', path: 'temp.pick', min: 1, max: 6 },
      { type: 'state.advance', path: 'timeline.currentSlot' }
    ];

    actions.forEach((action) => {
      expect(validateGameCard(cardWithAction(action))).toEqual({ valid: true, errors: [] });
    });
  });

  test('rejects missing and invalid state paths', () => {
    expect(errorsFor({ type: 'state.set', value: 1 })).toEqual([
      'rules[0].then[0].path: is required'
    ]);
    expect(errorsFor({ type: 'state.set', path: 'inventory[0]', value: 1 })[0])
      .toContain('rules[0].then[0].path: must match pattern');
    expect(errorsFor({ type: 'state.set', path: 'player..hp', value: 1 })[0])
      .toContain('rules[0].then[0].path: must match pattern');
  });

  test('requires JSON values for value-based state actions', () => {
    expect(errorsFor({ type: 'state.set', path: 'route' })).toEqual([
      'rules[0].then[0].value: is required'
    ]);
    expect(errorsFor({ type: 'state.append', path: 'inventory', value: Infinity })[0])
      .toContain('rules[0].then[0].value:');
  });

  test('rejects invalid random state action parameters', () => {
    expect(errorsFor({ type: 'state.roll', path: 'temp.roll', dice: '0d6' })[0])
      .toContain('rules[0].then[0].dice: must match pattern');
    expect(errorsFor({ type: 'state.randomInt', path: 'temp.pick', min: 6, max: 1 })).toEqual([
      'rules[0].then[0].max: must be >= 6'
    ]);
    expect(errorsFor({ type: 'state.randomInt', path: 'temp.pick', min: '1', max: 6 }))
      .toContain('rules[0].then[0].min: must be integer');
  });

  test('rejects unknown state action types', () => {
    expect(errorsFor({ type: 'state.merge', path: 'route', value: 'alice' })).toEqual([
      'rules[0].then[0].type: must be equal to one of the allowed values'
    ]);
  });
});
