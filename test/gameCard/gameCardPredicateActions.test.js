const { applyAction } = require('../../src/gameCard/actions');
const { applyGameCard } = require('../../src/gameCard/engine');
const { matchesPredicate, matchesWhen } = require('../../src/gameCard/predicate');

function cardWithRules(rules) {
  return {
    version: '1',
    id: 'predicate-actions-card',
    name: 'Predicate Actions Card',
    rules
  };
}

describe('game card predicate actions runtime', () => {
  test('matches role content and index predicates', () => {
    const messages = [
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'start quest' }
    ];

    expect(matchesPredicate({ role: 'user' }, messages[1], 1, messages)).toBe(true);
    expect(matchesPredicate({ content: { contains: 'quest' } }, messages[1], 1, messages)).toBe(true);
    expect(matchesPredicate({ content: { regex: '^start' } }, messages[1], 1, messages)).toBe(true);
    expect(matchesPredicate({ index: 'last' }, messages[1], 1, messages)).toBe(true);
    expect(matchesPredicate({ index: 0 }, messages[1], 1, messages)).toBe(false);
  });

  test('matches set and logical predicates', () => {
    const messages = [
      { role: 'system', content: 'rules' },
      { role: 'assistant', content: 'quest accepted' }
    ];

    expect(matchesPredicate({ role: { in: ['assistant', 'user'] } }, messages[1], 1, messages)).toBe(true);
    expect(matchesPredicate({ role: { nin: ['system'] } }, messages[1], 1, messages)).toBe(true);
    expect(matchesPredicate({ or: [{ role: 'user' }, { content: { contains: 'accepted' } }] }, messages[1], 1, messages)).toBe(true);
    expect(matchesPredicate({ not: { role: 'system' } }, messages[1], 1, messages)).toBe(true);
  });

  test('matches metadata source predicates', () => {
    const messages = [
      { role: 'system', content: 'rules', _meta: { source: 'game_card' } },
      { role: 'user', content: 'hello', _meta: { source: 'user' } }
    ];

    expect(matchesPredicate({ '_meta.source': 'game_card' }, messages[0], 0, messages)).toBe(true);
    expect(matchesPredicate({ '_meta.source': { contains: 'game' } }, messages[0], 0, messages)).toBe(true);
    expect(matchesPredicate({ '_meta.source': { regex: '^user$' } }, messages[0], 0, messages)).toBe(false);
  });

  test('matches when last predicates with length checks', () => {
    const messages = [{ role: 'user', content: 'hello' }];
    const when = {
      phase: 'pre_send',
      length: 1,
      last: { role: 'user', content: { contains: 'hello' } }
    };

    expect(matchesWhen(when, 'pre_send', messages)).toBe(true);
    expect(matchesWhen({ ...when, last: { role: 'assistant' } }, 'pre_send', messages)).toBe(false);
  });

  test('matches when any and all predicates against the message set', () => {
    const messages = [
      { role: 'user', content: 'start quest' },
      { role: 'assistant', content: 'quest accepted' }
    ];

    expect(matchesWhen({
      phase: 'after_response',
      any: { content: { contains: 'start' } },
      all: { role: { in: ['user', 'assistant'] } }
    }, 'after_response', messages)).toBe(true);
    expect(matchesWhen({
      phase: 'after_response',
      all: { content: { contains: 'quest' } }
    }, 'after_response', messages)).toBe(true);
    expect(matchesWhen({
      phase: 'after_response',
      all: { role: 'assistant' }
    }, 'after_response', messages)).toBe(false);
  });

  test('inserts before and after matched anchors', () => {
    const messages = [{ role: 'user', content: 'hello' }];

    const before = applyAction(messages, {
      type: 'insert',
      predicate: { index: 0 },
      role: 'system',
      content: 'rules'
    });
    const after = applyAction(messages, {
      type: 'insert',
      predicate: { index: 0 },
      anchor: 'after',
      role: 'assistant',
      content: 'ready',
      ttl: 1,
      _meta: { source: 'game_card' }
    });

    expect(before.messages.map((message) => message.role)).toEqual(['system', 'user']);
    expect(after.messages).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'ready', ttl: 1, _meta: { source: 'game_card' } }
    ]);
  });

  test('removes and replaces every matching message', () => {
    const messages = [
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'raw start' },
      { role: 'user', content: 'raw end' }
    ];

    const removed = applyAction(messages, { type: 'remove', predicate: { role: 'system' } });
    const replaced = applyAction(messages, {
      type: 'replace',
      predicate: { role: 'user' },
      content: 'fixed {{original_content}}'
    });

    expect(removed.messages).toEqual(messages.slice(1));
    expect(replaced.messages.map((message) => message.content)).toEqual([
      'rules',
      'fixed raw start',
      'fixed raw end'
    ]);
    expect(messages[1].content).toBe('raw start');
  });

  test('replace can update ttl and metadata without changing content', () => {
    const messages = [{
      role: 'system',
      content: 'rules',
      ttl: -1,
      _meta: { source: 'game_card', visibility: 'llm_only' }
    }];

    const result = applyAction(messages, {
      type: 'replace',
      predicate: { '_meta.source': 'game_card' },
      ttl: 2,
      _meta: { visibility: 'debug_only' }
    });

    expect(result.messages).toEqual([{
      role: 'system',
      content: 'rules',
      ttl: 2,
      _meta: { source: 'game_card', visibility: 'debug_only' }
    }]);
    expect(messages[0].ttl).toBe(-1);
  });

  test('records no-op traces when actions match nothing', () => {
    const messages = [{ role: 'user', content: 'hello' }];

    const removed = applyAction(messages, { type: 'remove', predicate: { role: 'system' } });
    const replaced = applyAction(messages, {
      type: 'replace',
      predicate: { content: { regex: '[' } },
      content: 'never'
    });

    expect(removed.messages).toBe(messages);
    expect(removed.trace).toMatchObject({ type: 'remove', applied: false, matched: 0 });
    expect(replaced.messages).toBe(messages);
    expect(replaced.trace).toMatchObject({ type: 'replace', applied: false, matched: 0 });
  });

  test('runs matching rules and actions in stable order', () => {
    const card = cardWithRules([
      {
        id: 'bootstrap',
        when: { phase: 'pre_send', length: 1, last: { role: 'user' } },
        then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'rules' }]
      },
      {
        id: 'mark',
        when: { phase: 'pre_send', last: { role: 'user' } },
        then: [{ type: 'replace', predicate: { index: 'last' }, content: 'marked' }]
      }
    ]);

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }]
    });

    expect(result.messages).toEqual([
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'marked' }
    ]);
    expect(result.trace.rules.map((rule) => rule.ruleId)).toEqual(['bootstrap', 'mark']);
  });
});
