const { act, renderHook } = require('@testing-library/react');
const useChatPresentationHandlers = require(
  '../../src/renderer/chat/useChatPresentationHandlers'
).default;

function presentation() {
  return {
    stopBgm: jest.fn(),
    updateAll: jest.fn(),
    updateBackground: jest.fn(),
    updateChanged: jest.fn(),
    updatePortrait: jest.fn()
  };
}

describe('chat presentation handlers', () => {
  test('does not restore or start inherited BGM for segmented cards', () => {
    const card = { display: { segmentedReading: true } };
    const state = { audio: { bgm: 'calm' } };
    const updates = presentation();
    const { result } = renderHook(() => useChatPresentationHandlers(card, updates));

    act(() => result.current.onSessionLoaded({ card, state }));
    act(() => result.current.onStreamContentStart({ card, state }));

    expect(updates.updateAll).not.toHaveBeenCalled();
    expect(updates.stopBgm).toHaveBeenCalledTimes(1);
    expect(updates.updateBackground).toHaveBeenCalledTimes(2);
    expect(updates.updatePortrait).toHaveBeenCalledTimes(2);
  });

  test('publishes every explicit segmented BGM set, including an unchanged value', () => {
    const card = { display: { segmentedReading: true } };
    const state = { audio: { bgm: 'calm' } };
    const updates = presentation();
    const { result } = renderHook(() => useChatPresentationHandlers(card, updates));

    act(() => result.current.onStatePatchApplied({
      card,
      state,
      presentationChangedKeys: [],
      patchTrace: { setPaths: ['audio.bgm'] }
    }));

    expect(updates.updateChanged).toHaveBeenCalledWith(card, state, ['audio.bgm']);
  });

  test('keeps normal cards on state-based presentation updates', () => {
    const card = { display: { segmentedReading: false } };
    const state = { audio: { bgm: 'calm' } };
    const updates = presentation();
    const { result } = renderHook(() => useChatPresentationHandlers(card, updates));

    act(() => result.current.onStreamContentStart({ card, state }));
    act(() => result.current.onStatePatchApplied({
      card,
      state,
      presentationChangedKeys: [],
      patchTrace: { setPaths: ['audio.bgm'] }
    }));

    expect(updates.updateAll).toHaveBeenCalledWith(card, state);
    expect(updates.stopBgm).not.toHaveBeenCalled();
    expect(updates.updateChanged).toHaveBeenCalledWith(card, state, []);
  });
});
