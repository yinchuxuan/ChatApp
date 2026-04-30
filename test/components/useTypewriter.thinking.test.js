/**
 * Tests for useTypewriter hook thinking parsing
 */

const R = require('react');
const { renderHook, act } = require('@testing-library/react');
const useTypewriter = require('../../src/components/useTypewriter.js');

describe('useTypewriter thinking parsing', () => {
  test('should separate thinking content from regular content', () => {
    const { result } = renderHook(() => useTypewriter(R));

    act(() => { result.current.startStreaming(); });
    act(() => { result.current.pushContent('<thinking>Let me think'); });

    expect(result.current.thinkingContent).toBe('Let me think');

    act(() => { result.current.pushContent('</thinking>Here is the answer'); });

    expect(result.current.thinkingContent).toBe('Let me think');
    expect(result.current.thinkingDone).toBe(true);
    expect(result.current.streamContent).toBe('Here is the answer');
  });

  test('should handle thinking tag split across chunks', () => {
    const { result } = renderHook(() => useTypewriter(R));

    act(() => { result.current.startStreaming(); });
    act(() => { result.current.pushContent('<thinking>'); });
    act(() => { result.current.pushContent('Thinking here'); });
    act(() => { result.current.pushContent('</thinking>'); });
    act(() => { result.current.pushContent('Response text'); });

    expect(result.current.thinkingContent).toBe('Thinking here');
    expect(result.current.thinkingDone).toBe(true);
    expect(result.current.streamContent).toBe('Response text');
  });
});
