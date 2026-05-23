const { applyGameCard, cloneMessages } = require('../../src/gameCard/engine');

function cardWithRules(rules) {
  return {
    version: '1',
    id: 'runtime-card',
    name: 'Runtime Card',
    rules
  };
}

describe('game card runtime step 2', () => {
  test('handles an omitted argument object', () => {
    const result = applyGameCard();

    expect(result.messages).toEqual([]);
    expect(result.state).toEqual({});
    expect(result.trace.errors).toEqual(['card must be an object']);
  });

  test('returns cloned messages and empty state for missing cards', () => {
    const messages = [{ role: 'user', content: 'hi', _meta: { source: 'user' } }];

    const result = applyGameCard({ phase: 'pre_send', messages });

    expect(result.messages).toEqual(messages);
    expect(result.messages).not.toBe(messages);
    expect(result.messages[0]).not.toBe(messages[0]);
    expect(result.messages[0]._meta).not.toBe(messages[0]._meta);
    expect(result.state).toEqual({});
    expect(result.trace.errors).toEqual(['card must be an object']);
  });

  test('returns validation errors when rules is missing', () => {
    const result = applyGameCard({
      card: { id: 'broken' },
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'hello' }]
    });

    expect(result.messages).toEqual([{ role: 'user', content: 'hello' }]);
    expect(result.state).toEqual({});
    expect(result.trace).toEqual({
      phase: 'pre_send',
      rules: [],
      errors: ['card.rules must be an array']
    });
  });

  test('defaults omitted messages to an empty array', () => {
    const result = applyGameCard({
      card: cardWithRules([{ when: { phase: 'pre_send' }, then: [] }]),
      phase: 'pre_send'
    });

    expect(result.messages).toEqual([]);
    expect(result.trace.rules).toHaveLength(1);
  });

  test('matches only rules for the current phase', () => {
    const card = cardWithRules([
      { id: 'pre', when: { phase: 'pre_send' }, then: [] },
      { id: 'after', when: { phase: 'after_response' }, then: [] }
    ]);

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }]
    });

    expect(result.trace.phase).toBe('pre_send');
    expect(result.trace.rules).toEqual([
      { ruleIndex: 0, ruleId: 'pre', matched: true, actions: [] }
    ]);
    expect(result.state).toEqual({});
  });

  test('keeps matched rules in original order', () => {
    const card = cardWithRules([
      { id: 'first', when: { phase: 'pre_send' }, then: [] },
      { id: 'second', when: { phase: 'pre_send' }, then: [] },
      { id: 'third', when: { phase: 'pre_send' }, then: [] }
    ]);

    const result = applyGameCard({ card, phase: 'pre_send', messages: [] });

    expect(result.trace.rules.map((rule) => rule.ruleId)).toEqual([
      'first',
      'second',
      'third'
    ]);
    expect(result.trace.rules.map((rule) => rule.ruleIndex)).toEqual([0, 1, 2]);
  });

  test('does not include unmatched rules in trace', () => {
    const card = cardWithRules([
      { id: 'pre', when: { phase: 'pre_send' }, then: [] },
      { id: 'after', when: { phase: 'after_response' }, then: [] }
    ]);

    const result = applyGameCard({ card, phase: 'after_response', messages: [] });

    expect(result.trace.rules).toEqual([
      { ruleIndex: 1, ruleId: 'after', matched: true, actions: [] }
    ]);
  });

  test('supports length checks during runtime rule selection', () => {
    const card = cardWithRules([
      { id: 'first', when: { phase: 'pre_send', length: { lte: 1 } }, then: [] },
      { id: 'later', when: { phase: 'pre_send', length: { gt: 1 } }, then: [] }
    ]);

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'only one' }]
    });

    expect(result.trace.rules.map((rule) => rule.ruleId)).toEqual(['first']);
  });

  test('supports exact length matching', () => {
    const card = cardWithRules([
      { id: 'empty', when: { phase: 'pre_send', length: 0 }, then: [] },
      { id: 'one', when: { phase: 'pre_send', length: 1 }, then: [] }
    ]);

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'hello' }]
    });

    expect(result.trace.rules.map((rule) => rule.ruleId)).toEqual(['one']);
  });

  test('keeps step 2 actions as no-op trace entries', () => {
    const card = cardWithRules([
      {
        when: { phase: 'pre_send' },
        then: [{ type: 'remove', predicate: { all: true } }]
      }
    ]);
    const messages = [{ role: 'user', content: 'keep me' }];

    const result = applyGameCard({ card, phase: 'pre_send', messages });

    expect(result.messages).toEqual(messages);
    expect(result.trace.rules[0].actions).toEqual([
      { type: 'remove', applied: false, reason: 'not_implemented' }
    ]);
  });

  test('clones each message and shallow-clones metadata', () => {
    const nested = { id: 'same-reference' };
    const messages = [
      {
        role: 'system',
        content: 'rules',
        _meta: { source: 'game_card', nested }
      }
    ];

    const cloned = cloneMessages(messages);

    expect(cloned).toEqual(messages);
    expect(cloned).not.toBe(messages);
    expect(cloned[0]).not.toBe(messages[0]);
    expect(cloned[0]._meta).not.toBe(messages[0]._meta);
    expect(cloned[0]._meta.nested).toBe(nested);
  });

  test('returns cloned messages even when no rules match', () => {
    const card = cardWithRules([
      { when: { phase: 'after_response' }, then: [] }
    ]);
    const messages = [{ role: 'user', content: 'hello' }];

    const result = applyGameCard({ card, phase: 'pre_send', messages });

    expect(result.messages).toEqual(messages);
    expect(result.messages).not.toBe(messages);
    expect(result.messages[0]).not.toBe(messages[0]);
    expect(result.trace.rules).toEqual([]);
  });

  test('cloneMessages tolerates non-array input', () => {
    expect(cloneMessages(null)).toEqual([]);
  });
});
