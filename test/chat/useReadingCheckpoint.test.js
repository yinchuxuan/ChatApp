const { act, renderHook, waitFor } = require('@testing-library/react');
const useReadingCheckpoint = require(
  '../../src/renderer/chat/useReadingCheckpoint'
).default;

describe('reading checkpoint', () => {
  test('persists the cursor only after reading state patches finish', async () => {
    let releaseProgress;
    const progressGate = new Promise(resolve => { releaseProgress = resolve; });
    const onReadProgress = jest.fn(() => progressGate);
    const onPositionChange = jest.fn();
    const entry = {
      key: 'reply', messageIndex: 0, pageCount: 3, streaming: false
    };

    renderHook(() => useReadingCheckpoint({
      enabled: true,
      isLoading: false,
      entries: [entry],
      activeCursor: { entryIndex: 0, pageIndex: 1 },
      activeEntry: entry,
      messages: [{ id: 'reply', role: 'assistant', content: 'response' }],
      onReadProgress,
      onPositionChange
    }));

    await waitFor(() => expect(onReadProgress).toHaveBeenCalled());
    expect(onPositionChange).not.toHaveBeenCalled();
    await act(async () => {
      releaseProgress();
      await progressGate;
    });
    await waitFor(() => expect(onPositionChange).toHaveBeenCalledWith({
      messageId: 'reply', segmentIndex: 1
    }));
  });
});
