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
  test('restores saved BGM for segmented cards without replaying it on first token', () => {
    const card = { display: { segmentedReading: true } };
    const state = { audio: { bgm: 'calm' } };
    const updates = presentation();
    const { result } = renderHook(() => useChatPresentationHandlers(card, updates));

    act(() => result.current.onSessionLoaded({ card, state }));
    act(() => result.current.onStreamContentStart({ card, state }));

    expect(updates.updateAll).toHaveBeenCalledTimes(1);
    expect(updates.updateAll).toHaveBeenCalledWith(card, state);
    expect(updates.stopBgm).not.toHaveBeenCalled();
    expect(updates.updateBackground).toHaveBeenCalledTimes(1);
    expect(updates.updatePortrait).toHaveBeenCalledTimes(1);
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

  test('restores the complete presentation after a provider failure', () => {
    const card = { display: { segmentedReading: true } };
    const state = { visual: { scene: 'school' }, audio: { bgm: 'calm' } };
    const updates = presentation();
    const { result } = renderHook(() => useChatPresentationHandlers(card, updates));

    act(() => result.current.onRequestFailureRestore(state));

    expect(updates.stopBgm).toHaveBeenCalledTimes(1);
    expect(updates.updateAll).toHaveBeenCalledWith(card, state);
  });
});
