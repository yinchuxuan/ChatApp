const { applyGameCard } = require('../../src/gameCard/engine');
const { matchesState, matchesWhen } = require('../../src/gameCard/predicate');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

function runtimeCard(rules) {
  return { version: '1', id: 'state-card', name: 'State Card', rules };
}

describe('when.state predicates', () => {
  test('matches literals, comparisons, sets, contains, regex, and exists', () => {
    const state = {
      player: { hp: 20 },
      route: 'alice',
      tags: ['injured', 'boss'],
      flags: { metBoss: false }
    };

    expect(matchesState({
      'player.hp': { lte: 20 },
      route: { in: ['alice', 'bad_end'] },
      tags: { contains: 'boss' },
      'flags.metBoss': false,
      missing: { exists: false },
      routeName: { exists: false }
    }, state)).toBe(true);
    expect(matchesState({ route: { regex: '^ali' } }, state)).toBe(true);
    expect(matchesState({ missing: { nin: ['alice'] } }, state)).toBe(false);
    expect(matchesState({ route: { regex: '[' } }, state)).toBe(false);
  });

  test('uses AND semantics with other when fields', () => {
    const messages = [{ role: 'user', content: 'fight boss' }];
    const when = {
      phase: 'pre_send',
      length: 1,
      last: { content: { contains: 'boss' } },
      state: { 'player.hp': { gt: 0 } }
    };

    expect(matchesWhen(when, 'pre_send', messages, { player: { hp: 5 } })).toBe(true);
    expect(matchesWhen(when, 'pre_send', messages, { player: { hp: 0 } })).toBe(false);
  });

  test('engine evaluates state conditions against current pipeline state', () => {
    const card = runtimeCard([
      {
        when: { phase: 'pre_send' },
        then: [{ type: 'exec', source: 'state.score = 2; return { state };' }]
      },
      {
        when: { phase: 'pre_send', state: { score: { gte: 2 } } },
        then: [{ type: 'insert', role: 'system', content: 'score gate open' }]
      }
    ]);

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'score' }],
      state: { score: 0 }
    });

    expect(result.state.score).toBe(2);
    expect(result.trace.rules.map((rule) => rule.ruleIndex)).toEqual([0, 1]);
    expect(result.messages[1]).toEqual({ role: 'system', content: 'score gate open' });
  });

  test('action when gates state actions and compares sortable strings', () => {
    const card = runtimeCard([
      {
        when: { phase: 'pre_send' },
        then: [
          { type: 'state.set', path: 'slot', value: 'next', when: { state: { time: { gte: '2007.10.22: 16:00' } } } }
        ]
      }
    ]);

    const early = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'go' }],
      state: { time: '2007.10.22: 15:59', slot: 'current' }
    });
    const late = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'go' }],
      state: { time: '2007.10.22: 16:00', slot: 'current' }
    });

    expect(early.state.slot).toBe('current');
    expect(early.trace.rules[0].actions[0].reason).toBe('when_not_matched');
    expect(late.state.slot).toBe('next');
  });

  test('validation accepts action when and string state comparisons', () => {
    const result = validateGameCard(runtimeCard([
      {
        when: { phase: 'pre_send' },
        then: [
          {
            type: 'state.set',
            path: 'route',
            value: 'next',
            when: { state: { time: { gte: '2007.10.22: 16:00' } } }
          }
        ]
      }
    ]));

    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('validation accepts supported state operators and rejects unknown ones', () => {
    expect(validateGameCard(runtimeCard([
      {
        when: { phase: 'pre_send', state: { route: 'alice', hp: { lte: 20 } } },
        then: [{ type: 'remove', predicate: { all: true } }]
      }
    ]))).toEqual({ valid: true, errors: [] });

    const result = validateGameCard(runtimeCard([
      {
        when: { phase: 'pre_send', state: { route: { startsWith: 'a' } } },
        then: [{ type: 'remove', predicate: { all: true } }]
      }
    ]));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('unknown state op');
  });
});
