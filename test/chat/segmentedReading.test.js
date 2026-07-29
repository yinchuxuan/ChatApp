const React = require('react');
const { act, render, renderHook } = require('@testing-library/react');
const DOMPurify = require('dompurify')(window);
const { marked } = require('marked');
const renderers = require('../../src/renderer/components/ChatPanelMessageRenderers').default;
const {
  isSegmentAdvanceEvent,
  splitReadingSegments
} = require('../../src/renderer/chat/useSegmentedReading');
const useSegmentedReading = require('../../src/renderer/chat/useSegmentedReading').default;

function renderSegmented(content, pageIndex, display, thinkingToggle = jest.fn()) {
  return render(renderers.renderAssistantMsg(
    React,
    { role: 'assistant', content, _thinking: 'reasoning' },
    0,
    false,
    null,
    '',
    false,
    jest.fn(),
    thinkingToggle,
    marked,
    DOMPurify,
    value => value,
    display,
    JSON.stringify(display || null),
    { enabled: true, pageIndex }
  ));
}

function clickEvent(overrides = {}) {
  const currentTarget = {
    ownerDocument: {
      defaultView: { getSelection: () => ({ isCollapsed: true }) }
    }
  };
  return {
    button: 0,
    currentTarget,
    defaultPrevented: false,
    target: { closest: () => null },
    type: 'click',
    ...overrides
  };
}

describe('segmented reading', () => {
  afterEach(() => jest.useRealTimers());

  test('splits only on blank paragraph lines and normalizes line endings', () => {
    expect(splitReadingSegments('第一行\n仍是第一段\r\n\r\n第二段\n\n\n第三段')).toEqual([
      '第一行\n仍是第一段',
      '第二段',
      '第三段'
    ]);
  });

  test('shows one paragraph and exposes its page count to the reading surface', () => {
    const toggleThinking = jest.fn();
    const { container } = renderSegmented('第一段。\n\n第二段。', 0, undefined, toggleThinking);
    const bubble = container.querySelector('.segmented-reading-bubble');

    expect(container.textContent).toContain('第一段。');
    expect(container.textContent).not.toContain('第二段。');
    expect(container.textContent).not.toContain('reasoning');
    expect(container.querySelector('[data-gc-part="message-thinking"]')).toBeNull();
    expect(bubble).toHaveAttribute('data-segment-count', '2');
    expect(toggleThinking).not.toHaveBeenCalled();
  });

  test('applies display rules before paragraph splitting', () => {
    const display = {
      assistant: [{
        id: 'hide-patch',
        stage: 'before_markdown',
        type: 'regex_replace',
        pattern: '<state_patch>[\\s\\S]*?<\\/state_patch>',
        flags: 'g',
        replace: ''
      }]
    };
    const content = '<state_patch>\\n[]\\n</state_patch>\n\n正文第一段。\n\n正文第二段。';
    const { container } = renderSegmented(content, 0, display);

    expect(container.textContent).toContain('正文第一段。');
    expect(container.textContent).not.toContain('state_patch');
    expect(container.textContent).not.toContain('正文第二段。');
  });

  test('does not advance from interactive children or selected text', () => {
    const interactive = document.createElement('a');
    const currentTarget = document.createElement('div');
    currentTarget.appendChild(interactive);
    expect(isSegmentAdvanceEvent(clickEvent({
      currentTarget,
      target: interactive
    }))).toBe(false);
    expect(isSegmentAdvanceEvent(clickEvent({
      currentTarget: {
        ownerDocument: {
          defaultView: { getSelection: () => ({ isCollapsed: false }) }
        }
      }
    }))).toBe(false);
    const header = document.createElement('div');
    header.setAttribute('data-gc-part', 'chat-header');
    currentTarget.appendChild(header);
    expect(isSegmentAdvanceEvent(clickEvent({
      currentTarget,
      target: header
    }))).toBe(false);
  });

  test('keeps the current page when streaming becomes a completed message', () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(props => useSegmentedReading(props), {
      initialProps: {
        enabled: true,
        isLoading: true,
        messageKey: 'previous',
        scopeKey: 1
      }
    });

    act(() => result.current.advance(clickEvent(), 3));
    expect(result.current.pageIndex).toBe(1);
    rerender({ enabled: true, isLoading: false, messageKey: 'completed', scopeKey: 1 });
    expect(result.current.pageIndex).toBe(1);
    act(() => jest.runAllTimers());
    rerender({ enabled: true, isLoading: false, messageKey: 'other', scopeKey: 1 });
    expect(result.current.pageIndex).toBe(0);
  });
});
