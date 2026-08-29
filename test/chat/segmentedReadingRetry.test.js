const { act, renderHook } = require('@testing-library/react');
const useSegmentedReading = require('../../src/renderer/chat/useSegmentedReading').default;

describe('segmented reading retry handoff', () => {
  test('returns to the replacement stream when its message id changes', () => {
    const messages = [
      { id: 'old-reply', role: 'assistant', content: '旧回复。' },
      { id: 'action', role: 'user', content: '继续。' }
    ];
    const initialProps = {
      enabled: true,
      isLoading: true,
      messages,
      streamContent: '旧流。',
      streamMessageId: 'old-stream',
      displayedCount: 3,
      scopeKey: 1
    };
    const { result, rerender } = renderHook(
      props => useSegmentedReading(props),
      { initialProps }
    );

    act(() => result.current.navigate('reading.previous'));
    expect(result.current.isHistory).toBe(true);

    rerender({
      ...initialProps,
      streamContent: '重新生成。',
      streamMessageId: 'retry-stream',
      displayedCount: 5
    });

    expect(result.current.isHistory).toBe(false);
    expect(result.current.isStreaming).toBe(true);
    expect(result.current.pageIndex).toBe(0);
  });
});
