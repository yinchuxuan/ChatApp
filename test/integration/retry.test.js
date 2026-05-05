/**
 * Integration Tests - useRetry hook (app-001)
 * Tests the retry logic independently
 */

const MessageCollapseRenderer = require('../../src/components/MessageCollapseRenderer.js');

describe('Retry helpers', () => {
  test('findLastUserIndex should return last user message index', () => {
    const msgs = [
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2' },
      { role: 'assistant', content: 'A2' }
    ];
    expect(MessageCollapseRenderer.findLastUserIndex(msgs)).toBe(2);
  });

  test('findLastUserIndex should return -1 when no user messages', () => {
    const msgs = [
      { role: 'assistant', content: 'A1' },
      { role: 'assistant', content: 'A2' }
    ];
    expect(MessageCollapseRenderer.findLastUserIndex(msgs)).toBe(-1);
  });

  test('findLastAssistantIndex should return last assistant message index', () => {
    const msgs = [
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2' }
    ];
    expect(MessageCollapseRenderer.findLastAssistantIndex(msgs)).toBe(1);
  });

  test('findLastAssistantIndex should return -1 when no assistant messages', () => {
    const msgs = [
      { role: 'user', content: 'Q1' },
      { role: 'user', content: 'Q2' }
    ];
    expect(MessageCollapseRenderer.findLastAssistantIndex(msgs)).toBe(-1);
  });

  test('retry should slice messages up to and including last user message', () => {
    const msgs = [
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' },
      { role: 'user', content: 'Q2' },
      { role: 'assistant', content: 'A2' }
    ];
    const lastUserIdx = msgs.map((m, i) => m.role === 'user' ? i : -1).filter(i => i >= 0).pop();
    const retryMessages = msgs.slice(0, lastUserIdx + 1);
    expect(retryMessages.length).toBe(3);
    expect(retryMessages[2].content).toBe('Q2');
    expect(retryMessages[2].role).toBe('user');
  });

  test('retry should prepare correct request payload', () => {
    const msgs = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' },
      { role: 'user', content: 'Bye' }
    ];
    const modelConfig = {
      apiUrl: 'http://api.example.com',
      apiKey: 'test-key',
      modelName: 'gpt-4',
      protocol: 'openai'
    };
    const lastUserIdx = msgs.map((m, i) => m.role === 'user' ? i : -1).filter(i => i >= 0).pop();
    const retryMessages = msgs.slice(0, lastUserIdx + 1);
    const payload = {
      apiUrl: modelConfig.apiUrl,
      apiKey: modelConfig.apiKey,
      modelName: modelConfig.modelName,
      protocol: modelConfig.protocol,
      messages: retryMessages.map(msg => ({ role: msg.role, content: msg.content }))
    };
    expect(payload.messages.length).toBe(3);
    expect(payload.messages[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(payload.messages[1]).toEqual({ role: 'assistant', content: 'Hi' });
    expect(payload.messages[2]).toEqual({ role: 'user', content: 'Bye' });
  });
});
