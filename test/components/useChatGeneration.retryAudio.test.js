import { act } from '@testing-library/react';
import { renderRetryGeneration } from './useChatGenerationTestHarness.js';

describe('useChatGeneration retry audio timing', () => {
  const originalSend = window.sendChatRequest;
  afterEach(() => { window.sendChatRequest = originalSend; });

  test('notifies once when retry body content starts streaming', async () => {
    const onStreamContentStart = jest.fn();
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => {
      callbacks.onToken('first');
      callbacks.onToken('second');
    });
    const { result } = renderRetryGeneration({ onStreamContentStart });
    await act(async () => { await result.current.retry(); });
    expect(onStreamContentStart).toHaveBeenCalledTimes(1);
  });

  test('does not notify for retry thinking-only tokens', async () => {
    const onStreamContentStart = jest.fn();
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => callbacks.onThinkingToken('thinking'));
    const { result } = renderRetryGeneration({ onStreamContentStart, pushContent: () => '' });
    await act(async () => { await result.current.retry(); });
    expect(onStreamContentStart).not.toHaveBeenCalled();
  });
});
