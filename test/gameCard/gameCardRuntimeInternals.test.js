const { applyAction, applyActions } = require('../../src/gameCard/actions');
const { applyGameCard } = require('../../src/gameCard/engine');
const { compareNumber, matchesWhen } = require('../../src/gameCard/predicate');
const { decayTTL } = require('../../src/gameCard/ttl');

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
    expect(result.trace).toEqual(expect.objectContaining({
      type: 'unknown',
      applied: false,
      reason: 'not_implemented'
    }));
  });

  test('applyActions keeps placeholder traces in action order', () => {
    const messages = [{ role: 'user', content: 'hello' }];

    const result = applyActions(messages, [{ type: 'insert' }, { type: 'replace' }]);

    expect(result.messages).toBe(messages);
    expect(result.trace.map((entry) => entry.type)).toEqual(['insert', 'replace']);
  });

  test('applyGameCard records message summaries and runtime errors in trace', () => {
    const card = {
      version: '1',
      id: 'trace-card',
      name: 'Trace Card',
      rules: [
        {
          id: 'insert',
          when: { phase: 'pre_send' },
          then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'rules' }]
        },
        { id: 'bad-when', when: { phase: 'pre_send', any: { or: {} } }, then: [] }
      ]
    };

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'hello' }],
      state: { hp: 10 }
    });

    expect(result.state).toEqual({ hp: 10 });
    expect(result.trace.rules[0].summary).toEqual({
      messages: { before: 1, after: 2, inserted: 1, removed: 0, replaced: 0 },
      state: { changedKeys: [] }
    });
    expect(result.trace.rules[0].actions[0].summary.messages.inserted).toBe(1);
    expect(result.trace.errors[0]).toMatch('rule[1] when:');
  });

  test('decayTTL keeps permanent messages and removes expired temporary messages', () => {
    const messages = [
      { role: 'system', content: 'permanent' },
      { role: 'system', content: 'also permanent', ttl: -1 },
      { role: 'system', content: 'next round', ttl: 2, _meta: { source: 'game_card' } },
      { role: 'system', content: 'expires now', ttl: 1 }
    ];

    const result = decayTTL(messages);

    expect(result.messages).toEqual([
      { role: 'system', content: 'permanent' },
      { role: 'system', content: 'also permanent', ttl: -1 },
      { role: 'system', content: 'next round', ttl: 1, _meta: { source: 'game_card' } }
    ]);
    expect(result.messages[2]).not.toBe(messages[2]);
    expect(result.messages[2]._meta).not.toBe(messages[2]._meta);
    expect(result.trace).toEqual({
      phase: 'ttl_decay',
      summary: {
        messages: { before: 4, after: 3, decayed: 2, removed: 1 },
        state: { changedKeys: [] }
      },
      errors: []
    });
  });

  test('decayTTL reports invalid ttl values without dropping messages', () => {
    const result = decayTTL([{ role: 'system', content: 'bad', ttl: 'soon' }]);

    expect(result.messages).toEqual([{ role: 'system', content: 'bad', ttl: 'soon' }]);
    expect(result.trace.errors).toEqual(['message ttl must be a number']);
  });
});
