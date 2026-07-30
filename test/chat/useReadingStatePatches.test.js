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

    act(() => result.current({ ...progress, targetBoundary: 1, terminal: false }));
    await waitFor(() => expect(setState).toHaveBeenCalledWith({ applied: ['middle'] }));
    act(() => result.current({ ...progress, targetBoundary: 1, terminal: false }));
    await Promise.resolve();
    expect(generationServices.prepareStatePatchAtCursor).toHaveBeenCalledTimes(1);
    expect(generationServices.prepareAfterResponseMessages).not.toHaveBeenCalled();

    act(() => result.current({ ...progress, targetBoundary: 3, terminal: true }));
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
});
