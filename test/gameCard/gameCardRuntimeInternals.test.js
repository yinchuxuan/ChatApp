const { applyAction, applyActions } = require('../../src/gameCard/actions');
const { compareNumber, matchesWhen } = require('../../src/gameCard/predicate');

describe('game card runtime internals', () => {
  test('compareNumber supports all documented comparison operators', () => {
    expect(compareNumber(2, 2)).toBe(true);
    expect(compareNumber(2, 3)).toBe(false);
    expect(compareNumber(2, { gt: 1, gte: 2, lt: 3, lte: 2, eq: 2 })).toBe(true);
    expect(compareNumber(2, { gt: 2 })).toBe(false);
    expect(compareNumber(2, { unknown: 2 })).toBe(false);
    expect(compareNumber(2, null)).toBe(false);
  });

  test('matchesWhen rejects missing or different phases', () => {
    expect(matchesWhen(null, 'pre_send', [])).toBe(false);
    expect(matchesWhen({ phase: 'after_response' }, 'pre_send', [])).toBe(false);
    expect(matchesWhen({ phase: 'pre_send' }, 'pre_send', [])).toBe(true);
  });

  test('applyAction records unknown action placeholders', () => {
    const messages = [{ role: 'user', content: 'hello' }];

    const result = applyAction(messages);

    expect(result.messages).toBe(messages);
    expect(result.trace).toEqual({
      type: 'unknown',
      applied: false,
      reason: 'not_implemented'
    });
  });

  test('applyActions keeps placeholder traces in action order', () => {
    const messages = [{ role: 'user', content: 'hello' }];

    const result = applyActions(messages, [{ type: 'insert' }, { type: 'replace' }]);

    expect(result.messages).toBe(messages);
    expect(result.trace.map((entry) => entry.type)).toEqual(['insert', 'replace']);
  });
});
