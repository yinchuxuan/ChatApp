import { act } from '@testing-library/react';
import generationServices from '../../src/renderer/chat/generationServices.js';
import { renderRetryGeneration } from './useChatGenerationTestHarness.js';

describe('useChatGeneration retry audio timing', () => {
  const originalSend = generationServices.sendChatRequest;
  afterEach(() => { generationServices.sendChatRequest = originalSend; });

  test('notifies once when retry body content starts streaming', async () => {
    const onStreamContentStart = jest.fn();
    generationServices.sendChatRequest = jest.fn(async (_payload, callbacks) => {
      callbacks.onToken('first');
      callbacks.onToken('second');
    });
    const { result } = renderRetryGeneration({ onStreamContentStart });
    await act(async () => { await result.current.retry(); });
    expect(onStreamContentStart).toHaveBeenCalledTimes(1);
  });

  test('does not notify for retry thinking-only tokens', async () => {
    const onStreamContentStart = jest.fn();
    generationServices.sendChatRequest = jest.fn(async (_payload, callbacks) => callbacks.onThinkingToken('thinking'));
    const { result } = renderRetryGeneration({ onStreamContentStart, pushContent: () => '' });
    await act(async () => { await result.current.retry(); });
    expect(onStreamContentStart).not.toHaveBeenCalled();
  });

  test('stops audio and restores the retry snapshot before generating', async () => {
    const events = [];
    const retryState = {
      visual: { scene: 'school', portraits: { touma: 'normal' } }
    };
    generationServices.sendChatRequest = jest.fn(async () => {
      events.push('request-started');
    });
    const { result } = renderRetryGeneration({
      retryBaseState: retryState,
      options: {
        onAudioSubmit: () => events.push('audio-stopped'),
        onRetryStateRestore: state => events.push(`visual-restored:${state.visual.scene}`)
      }
    });

    await act(async () => { await result.current.retry(); });

    expect(events).toEqual([
      'audio-stopped',
      'visual-restored:school',
      'request-started'
    ]);
  });
});
