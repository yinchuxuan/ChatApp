const {
  extractActiveCard,
  loadActiveGameCard,
  preparePreSendMessages,
  prepareAfterResponseMessages,
  toApiMessages
} = require('../../src/gameCard/sendPipeline');

function cardWithInsert(content) {
  return {
    version: '1',
    id: 'send-card',
    name: 'Send Card',
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
  beforeEach(() => {
    window.electronAPI.readGameCardFile.mockClear();
  });

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

  test('decays existing ttl messages before applying pre_send rules', async () => {
    const messages = [
      { role: 'system', content: 'expired', ttl: 1 },
      { role: 'system', content: 'kept', ttl: 2 },
      { role: 'user', content: 'start' }
    ];
    const result = await preparePreSendMessages({
      messages,
      card: cardWithInsert('system rules')
    });

    expect(result.messages).toEqual([
      { role: 'system', content: 'system rules', _meta: { visibility: 'llm_only' } },
      { role: 'system', content: 'kept', ttl: 1 },
      { role: 'user', content: 'start' }
    ]);
    expect(result.ttlTrace.summary.messages).toMatchObject({ decayed: 1, removed: 1 });
  });

  test('preloads file_content through electronAPI before applying rules', async () => {
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: 'loaded rules'
    });
    const messages = [{ role: 'user', content: 'start' }];
    const result = await preparePreSendMessages({
      messages,
      card: cardWithInsert('{{file_content:worldbook/rules.md}}')
    });

    expect(window.electronAPI.readGameCardFile)
      .toHaveBeenCalledWith('send-card', 'worldbook/rules.md');
    expect(result.messages[0].content).toBe('loaded rules');
  });

  test('gracefully returns applied=false when file_content preload fails', async () => {
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: false,
      error: 'blocked path'
    });

    const result = await preparePreSendMessages({
      messages: [{ role: 'user', content: 'start' }],
      card: cardWithInsert('{{file_content:../secret.md}}')
    });

    expect(result.applied).toBe(false);
    expect(result.error).toBe('blocked path');
    expect(result.messages).toEqual([{ role: 'user', content: 'start' }]);
  });

  test('returns the original messages object after response when no card is active', async () => {
    const messages = [{ role: 'assistant', content: 'hello', ttl: 1 }];
    const result = await prepareAfterResponseMessages({ messages, card: null });

    expect(result.applied).toBe(false);
    expect(result.messages).toBe(messages);
    expect(result.messages).toEqual([{ role: 'assistant', content: 'hello', ttl: 1 }]);
  });

  test('applies after_response rules without decaying newly inserted ttl', async () => {
    const messages = [{ role: 'assistant', content: 'raw' }];
    const result = await prepareAfterResponseMessages({
      messages,
      card: {
        version: '1',
        id: 'after-card',
        name: 'After Card',
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
    expect(result.messages).toEqual([
      { role: 'assistant', content: 'clean' },
      { role: 'system', content: 'next', ttl: 1 }
    ]);
    expect(result.ttlTrace).toBeNull();
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
