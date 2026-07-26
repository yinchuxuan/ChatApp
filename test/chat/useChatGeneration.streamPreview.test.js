import { act } from '@testing-library/react';
import generationServices from '../../src/renderer/chat/generationServices.js';
import { renderRetryGeneration } from './useChatGenerationTestHarness.js';

describe('useChatGeneration stream preview', () => {
  const originals = { ...generationServices };

  afterEach(() => {
    Object.assign(generationServices, originals);
  });

  test('applies a fragmented leading patch before visible body starts', async () => {
    const events = [];
    const previewState = {
      scene: { portrait: 'touma_normal' },
      visual: { portrait: 'touma_normal' }
    };
    generationServices.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
      applied: false,
      card: { id: 'card' },
      messages,
      state
    }));
    generationServices.prepareStreamPreviewState = jest.fn(async () => {
      await Promise.resolve();
      events.push('preview');
      return { applied: true, state: previewState };
    });
    generationServices.sendChatRequest = jest.fn(async (_request, callbacks) => {
      callbacks.onToken('<state_');
      callbacks.onToken('patch>[{"type":"state.set","path":"scene.portrait",');
      callbacks.onToken('"value":"touma_normal"}]</state_patch>');
      callbacks.onToken('\n正文');
    });
    generationServices.prepareAfterResponseMessages = jest.fn(async ({ messages }) => ({
      applied: false, messages, state: previewState
    }));
    generationServices.toGameCardApiMessages = jest.fn(messages => messages);
    const setGameState = jest.fn(state => {
      if (state === previewState) events.push('state');
    });
    const onStreamContentStart = jest.fn(() => events.push('body'));
    const { result, options } = renderRetryGeneration({
      onStreamContentStart,
      options: { setGameState }
    });

    await act(async () => { await result.current.retry(); });

    expect(events.slice(0, 3)).toEqual(['preview', 'state', 'body']);
    expect(onStreamContentStart).toHaveBeenCalledWith({
      card: { id: 'card' },
      state: previewState
    });
    expect(options.setGameState).toHaveBeenCalledWith(previewState);
    expect(options.setGameState).toHaveBeenLastCalledWith(previewState);
    const streamed = options.typewriter.pushContent.mock.calls
      .filter(([, type]) => type !== 'reasoning')
      .map(([text]) => text)
      .join('');
    expect(streamed).not.toContain('<state_patch>');
    expect(streamed).toContain('正文');
    const completedMessages = generationServices.prepareAfterResponseMessages.mock.calls[0][0].messages;
    expect(completedMessages.at(-1).content).toContain('<state_patch>');
  });

  test.each([
    ['aborts', 'AbortError'],
    ['fails', 'Error']
  ])('keeps the optimistic preview after the request %s', async (_label, errorName) => {
    const previewState = { visual: { portrait: 'touma_normal' } };
    generationServices.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
      applied: false, card: { id: 'card' }, messages, state
    }));
    generationServices.prepareStreamPreviewState = jest.fn(async () => ({
      applied: true, state: previewState
    }));
    generationServices.sendChatRequest = jest.fn(async (_request, callbacks) => {
      callbacks.onToken(
        '<state_patch>{"type":"state.set","path":"scene.portrait","value":"touma_normal"}</state_patch>'
      );
      const error = new Error(errorName);
      error.name = errorName;
      throw error;
    });
    generationServices.toGameCardApiMessages = jest.fn(messages => messages);
    const { result, options } = renderRetryGeneration();

    await act(async () => { await result.current.retry(); });

    expect(options.setGameState).toHaveBeenCalledWith(previewState);
    expect(options.setGameState).toHaveBeenLastCalledWith(previewState);
  });
});
