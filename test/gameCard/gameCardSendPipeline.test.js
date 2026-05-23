const {
  extractActiveCard,
  loadActiveGameCard,
  preparePreSendMessages,
  prepareAfterResponseMessages,
  toApiMessages
} = require('../../src/gameCard/sendPipeline');

function cardWithInsert(content) {
  return {
    id: 'send-card',
    rules: [{
      when: { phase: 'pre_send' },
      then: [{
        type: 'insert',
        predicate: { index: 0 },
        role: 'system',
        content,
        _meta: { visibility: 'llm_only' }
      }]
    }]
  };
}

describe('game card send pipeline', () => {
  test('extracts supported active card response shapes', () => {
    const card = cardWithInsert('rules');

    expect(extractActiveCard(card)).toBe(card);
    expect(extractActiveCard({ success: true, card })).toBe(card);
    expect(extractActiveCard({ success: true, gameCard: card })).toBe(card);
    expect(extractActiveCard({ success: true, activeGameCard: card })).toBe(card);
    expect(extractActiveCard({ success: false, card })).toBeNull();
  });

  test('returns the original messages object when no card is active', async () => {
    const messages = [{ role: 'user', content: 'hello' }];
    const result = await preparePreSendMessages({ messages, card: null });

    expect(result.applied).toBe(false);
    expect(result.messages).toBe(messages);
    expect(result.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  test('loads no card when IPC is unavailable or fails', async () => {
    await expect(loadActiveGameCard(null)).resolves.toBeNull();
    await expect(loadActiveGameCard({ getActiveGameCard: jest.fn().mockRejectedValue(new Error('x')) }))
      .resolves.toBeNull();
  });

  test('applies pre_send rules only when a card is active', async () => {
    const messages = [{ role: 'user', content: 'start' }];
    const result = await preparePreSendMessages({
      messages,
      card: cardWithInsert('system rules')
    });

    expect(result.applied).toBe(true);
    expect(result.messages).toEqual([
      { role: 'system', content: 'system rules', _meta: { visibility: 'llm_only' } },
      { role: 'user', content: 'start' }
    ]);
  });

  test('returns the original messages object after response when no card is active', async () => {
    const messages = [{ role: 'assistant', content: 'hello', ttl: 1 }];
    const result = await prepareAfterResponseMessages({ messages, card: null });

    expect(result.applied).toBe(false);
    expect(result.messages).toBe(messages);
    expect(result.messages).toEqual([{ role: 'assistant', content: 'hello', ttl: 1 }]);
  });

  test('applies after_response rules and decays ttl when a card is active', async () => {
    const messages = [{ role: 'assistant', content: 'raw' }];
    const result = await prepareAfterResponseMessages({
      messages,
      card: {
        id: 'after-card',
        rules: [{
          when: { phase: 'after_response', last: { role: 'assistant' } },
          then: [
            { type: 'replace', predicate: { index: 'last' }, content: 'clean' },
            { type: 'insert', predicate: { index: 'last' }, anchor: 'after', role: 'system', content: 'next', ttl: 1 }
          ]
        }]
      }
    });

    expect(result.applied).toBe(true);
    expect(result.messages).toEqual([{ role: 'assistant', content: 'clean' }]);
    expect(result.ttlTrace.summary.messages.removed).toBe(1);
  });

  test('maps runtime messages to API messages without runtime-only fields', () => {
    const messages = [
      { role: 'system', content: 'rules', ttl: 1, _meta: { visibility: 'llm_only' } },
      { role: 'system', content: 'trace', _meta: { visibility: 'debug_only' } },
      { role: 'user', content: 'hello' }
    ];

    expect(toApiMessages(messages)).toEqual([
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'hello' }
    ]);
  });
});
