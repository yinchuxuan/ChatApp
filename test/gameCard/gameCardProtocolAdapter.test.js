const { adaptMessagesToProtocol } = require('../../src/gameCard/protocolAdapter');

describe('game card protocol adapter', () => {
  const runtimeMessages = [
    { role: 'system', content: 'rules', ttl: 1, _meta: { visibility: 'llm_only' } },
    { role: 'system', content: 'private trace', _meta: { visibility: 'debug_only' } },
    { role: 'user', content: 'hello', _meta: { source: 'user' } },
    { role: 'assistant', content: 'hi', thinking: 'hidden' }
  ];

  test('keeps system messages in OpenAI messages and removes runtime-only fields', () => {
    expect(adaptMessagesToProtocol(runtimeMessages, 'openai')).toEqual({
      messages: [
        { role: 'system', content: 'rules' },
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' }
      ]
    });
  });

  test('moves system messages to top-level Anthropic system field', () => {
    expect(adaptMessagesToProtocol(runtimeMessages, 'anthropic')).toEqual({
      system: 'rules',
      messages: [
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'hi' }
      ]
    });
  });

  test('joins multiple Anthropic system messages in original order', () => {
    const result = adaptMessagesToProtocol([
      { role: 'system', content: 'first' },
      { role: 'user', content: 'hello' },
      { role: 'system', content: 'second' }
    ], 'anthropic');

    expect(result.system).toBe('first\n\nsecond');
    expect(result.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });
});
