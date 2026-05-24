const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('./electronAppHelper');

let appHelper;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
}, { timeout: 30000 });

test.afterAll(async () => {
  await appHelper.close();
});

function baseCard(rules) {
  return { version: '1.0', id: 'runtime', name: 'Runtime', rules };
}

test.describe('Game Card browser runtime', () => {
  test('runs matching rules in order and records trace summaries', async () => {
    const result = await appHelper.evaluate(({ card }) => {
      return window.applyGameCard({
        card,
        phase: 'pre_send',
        messages: [{ role: 'user', content: 'start quest' }]
      });
    }, {
      card: baseCard([
        {
          when: { phase: 'pre_send', any: { content: { contains: 'quest' } } },
          then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'rules' }]
        },
        {
          when: { phase: 'pre_send', last: { role: 'user' } },
          then: [{ type: 'replace', predicate: { index: 'last' }, content: '{{raw_string:player: }} + {{original_content}}' }]
        }
      ])
    });

    expect(result.messages).toEqual([
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'player: start quest' }
    ]);
    expect(result.trace.rules).toHaveLength(2);
    expect(result.trace.rules[0].summary.messages.inserted).toBe(1);
    expect(result.trace.rules[1].summary.messages.replaced).toBe(1);
  });

  test('supports content regex transforms and remove predicates', async () => {
    const result = await appHelper.evaluate(({ card }) => {
      return window.applyGameCard({
        card,
        phase: 'after_response',
        messages: [
          { role: 'system', content: 'debug', _meta: { source: 'game_card' } },
          { role: 'assistant', content: '```json\n{"ok":true}\n```' }
        ]
      });
    }, {
      card: baseCard([{
        when: { phase: 'after_response' },
        then: [
          { type: 'remove', predicate: { '_meta.source': 'game_card' } },
          {
            type: 'replace',
            predicate: { role: 'assistant' },
            content: "{{original_content}}.regex_extract{pattern:'\\\\{.*\\\\}',group:0}"
          }
        ]
      }])
    });

    expect(result.messages).toEqual([{ role: 'assistant', content: '{"ok":true}' }]);
    expect(result.trace.rules[0].summary.messages.removed).toBe(1);
  });

  test('decays ttl after after_response rules', async () => {
    const result = await appHelper.evaluate(async ({ card }) => {
      return window.prepareAfterResponseMessages({
        card,
        messages: [
          { role: 'system', content: 'drop', ttl: 1 },
          { role: 'system', content: 'keep', ttl: 2 },
          { role: 'assistant', content: 'ok' }
        ]
      });
    }, { card: baseCard([]) });

    expect(result.messages).toEqual([
      { role: 'system', content: 'keep', ttl: 1 },
      { role: 'assistant', content: 'ok' }
    ]);
    expect(result.ttlTrace.summary.messages.decayed).toBe(1);
    expect(result.ttlTrace.summary.messages.removed).toBe(1);
  });

  test('exec updates state and blocks unsafe browser APIs', async () => {
    const mutation = await appHelper.evaluate(({ card }) => {
      return window.applyGameCard({
        card,
        phase: 'pre_send',
        messages: [{ role: 'user', content: 'hit' }],
        state: { hp: 10 }
      });
    }, {
      card: baseCard([{
        when: { phase: 'pre_send' },
        then: [{ type: 'exec', source: 'state.hp = utils.clamp(state.hp - 3, 0, 10); return { messages, state };' }]
      }])
    });

    const blocked = await appHelper.evaluate(({ card }) => {
      return window.applyGameCard({
        card,
        phase: 'pre_send',
        messages: [{ role: 'user', content: 'x' }]
      });
    }, {
      card: baseCard([{
        when: { phase: 'pre_send' },
        then: [{ type: 'exec', source: 'return fetch("https://example.com");' }]
      }])
    });

    expect(mutation.state.hp).toBe(7);
    expect(mutation.trace.rules[0].actions[0].type).toBe('exec');
    expect(mutation.trace.errors).toEqual([]);
    expect(blocked.trace.errors[0]).toContain('blocked browser runtime token');
  });
});
