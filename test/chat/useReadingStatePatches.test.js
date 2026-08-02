const { act, renderHook, waitFor } = require('@testing-library/react');
const generationServices = require('../../src/renderer/chat/generationServices').default;
const useReadingStatePatches = require(
  '../../src/renderer/chat/useReadingStatePatches'
).default;

describe('reading state patch consumption', () => {
  const originals = { ...generationServices };

  afterEach(() => Object.assign(generationServices, originals));

  test('applies newly crossed patches exactly once and defers after_response to the end', async () => {
    const message = {
      id: 'reply',
      role: 'assistant',
      content: 'response',
      _meta: {
        statePatchPlayback: {
          appliedPatchCount: 1,
          afterResponseApplied: false
        }
      }
    };
    const patches = [
      { ordinal: 0, boundary: 0, text: 'opening' },
      { ordinal: 1, boundary: 1, text: 'middle' },
      { ordinal: 2, boundary: 3, text: 'ending' }
    ];
    generationServices.prepareStatePatchAtCursor = jest.fn(async ({ patchText, state }) => ({
      applied: true,
      card: { id: 'card' },
      presentationChangedKeys: [],
      presentationEffects: [],
      state: { ...state, applied: [...(state.applied || []), patchText] }
    }));
    generationServices.prepareAfterResponseMessages = jest.fn(async ({ messages, state }) => ({
      applied: true,
      card: { id: 'card' },
      messages,
      presentationEffects: [],
      state: { ...state, finished: true }
    }));
    const setMessages = jest.fn();
    const setState = jest.fn();
    const typewriter = {
      getAppliedPatchCount: jest.fn(() => 1),
      markPatchApplied: jest.fn()
    };
    const { result } = renderHook(() => useReadingStatePatches({
      card: { id: 'card' },
      messages: [message],
      setMessages,
      state: {},
      setState,
      typewriter,
      scopeKey: 1
    }));
    const progress = {
      entry: {
        key: 'reply',
        messageIndex: 0,
        pageCount: 3,
        patches,
        streaming: false
      },
      message
    };

    await act(async () => {
      await result.current({ ...progress, targetBoundary: 1, terminal: false });
    });
    await waitFor(() => expect(setState).toHaveBeenCalledWith({ applied: ['middle'] }));
    await act(async () => {
      await result.current({ ...progress, targetBoundary: 1, terminal: false });
    });
    expect(generationServices.prepareStatePatchAtCursor).toHaveBeenCalledTimes(1);
    expect(generationServices.prepareAfterResponseMessages).not.toHaveBeenCalled();

    await act(async () => {
      await result.current({ ...progress, targetBoundary: 3, terminal: true });
    });
    await waitFor(() => expect(generationServices.prepareAfterResponseMessages).toHaveBeenCalledTimes(1));
    expect(generationServices.prepareStatePatchAtCursor).toHaveBeenCalledTimes(2);
    expect(setState).toHaveBeenLastCalledWith({
      applied: ['middle', 'ending'],
      finished: true
    });
    expect(setMessages).toHaveBeenLastCalledWith([
      expect.objectContaining({
        _meta: {
          statePatchPlayback: {
            appliedPatchCount: 3,
            afterResponseApplied: true
          }
        }
      })
    ]);
  });

  test('does not replay a queued streaming patch after the message completes', async () => {
    let releasePatch;
    const patchGate = new Promise(resolve => { releasePatch = resolve; });
    generationServices.prepareStatePatchAtCursor = jest.fn(async ({ state }) => {
      await patchGate;
      return {
        applied: true,
        card: { id: 'card' },
        presentationChangedKeys: ['audio.bgm'],
        presentationEffects: [],
        state: { ...state, bgm: 'tense' }
      };
    });
    const message = {
      id: 'reply',
      role: 'assistant',
      content: 'response',
      _meta: { statePatchPlayback: { appliedPatchCount: 0, afterResponseApplied: false } }
    };
    const props = {
      card: { id: 'card' },
      messages: [],
      setMessages: jest.fn(),
      state: {},
      setState: jest.fn(),
      typewriter: { getAppliedPatchCount: () => 0, markPatchApplied: jest.fn() },
      onPatchApplied: jest.fn(),
      scopeKey: 1
    };
    const { result, rerender } = renderHook(next => useReadingStatePatches(next), {
      initialProps: props
    });
    const entry = {
      key: 'reply', messageIndex: 0, pageCount: 1,
      patches: [{ ordinal: 0, boundary: 1, text: 'bgm' }], streaming: true
    };

    act(() => { void result.current({
      entry, message: null, targetBoundary: 1, terminal: false
    }); });
    rerender({ ...props, messages: [message] });
    act(() => { void result.current({
      entry: { ...entry, streaming: false }, message, targetBoundary: 1, terminal: false
    }); });
    await act(async () => {
      releasePatch();
      await patchGate;
    });
    await waitFor(() => {
      expect(generationServices.prepareStatePatchAtCursor).toHaveBeenCalledTimes(1);
    });
    expect(props.onPatchApplied).toHaveBeenCalledTimes(1);
  });
});
