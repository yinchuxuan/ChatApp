const { applyStateAction } = require('../../src/gameCard/stateActions');

describe('random state actions', () => {
  afterEach(() => {
    if (Math.random.mockRestore) Math.random.mockRestore();
  });

  test('state.roll and state.randomInt write generated numbers', () => {
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.9);

    const rolled = applyStateAction({}, {
      type: 'state.roll',
      path: 'temp.roll',
      dice: '2d6'
    });
    const picked = applyStateAction(rolled.state, {
      type: 'state.randomInt',
      path: 'temp.pick',
      min: 10,
      max: 12
    });

    expect(rolled.state.temp.roll).toBe(5);
    expect(picked.state.temp.pick).toBe(12);
    expect(picked.trace).toMatchObject({
      type: 'state.randomInt',
      applied: true,
      summary: { state: { changedKeys: ['temp.pick'] } }
    });
  });

  test('random state actions reject invalid inputs without changing state', () => {
    const state = { temp: { roll: 1 } };
    const badDice = applyStateAction(state, {
      type: 'state.roll',
      path: 'temp.roll',
      dice: '0d6'
    });
    const badRange = applyStateAction(state, {
      type: 'state.randomInt',
      path: 'temp.roll',
      min: 6,
      max: 1
    });

    expect(badDice.state).toEqual(state);
    expect(badRange.state).toEqual(state);
    expect(badDice.trace).toMatchObject({ applied: false, reason: 'invalid_dice' });
    expect(badRange.trace).toMatchObject({ applied: false, reason: 'invalid_range' });
  });
});
