/**
 * Tests for drag-to-expand interaction in MessageCollapseRenderer
 * Verifies mouse drag gesture triggers history expansion
 */

const MessageCollapseRenderer = require('../../src/components/MessageCollapseRenderer.js');
const R = require('react');
const { render: _render } = require('@testing-library/react');

const mockMsgs = [
  { role: 'user', content: 'first' },
  { role: 'assistant', content: 'response' },
  { role: 'user', content: 'second' }
];
const mockTw = { displayedCount: 0, streamContent: { slice: () => '', content: '' } };
const renderMarkdown = (text) => R.createElement('div', { className: 'content' }, text);
const renderAssistantMsg = () => null;

describe('MessageCollapseRenderer - drag-to-expand', () => {
  test('onExpand callback fires when dragging down past threshold', () => {
    const mockOnExpand = jest.fn();
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, false, mockOnExpand
    );
    const container = _render(result);
    const view = container.container.querySelector('.collapsed-message-view');
    expect(view).toBeInTheDocument();

    // Simulate drag via the onmousedown handler set on the element
    view.onmousedown({ button: 0, clientY: 100 });
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 180 }));

    expect(mockOnExpand).toHaveBeenCalled();
  });

  test('onExpand does not fire when drag is too small', () => {
    const mockOnExpand = jest.fn();
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, false, mockOnExpand
    );
    const container = _render(result);
    const view = container.container.querySelector('.collapsed-message-view');

    view.onmousedown({ button: 0, clientY: 100 });
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 105 }));
    document.dispatchEvent(new MouseEvent('mouseup'));

    expect(mockOnExpand).not.toHaveBeenCalled();
  });

  test('onExpand does not fire when already expanded', () => {
    const mockOnExpand = jest.fn();
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, true, mockOnExpand
    );
    const container = _render(result);
    const view = container.container.querySelector('.collapsed-message-view');

    // When already expanded, no drag handler is attached
    expect(view.onmousedown).toBeNull();
    expect(mockOnExpand).not.toHaveBeenCalled();
  });

  test('expanded view renders all prior history messages', () => {
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, true, () => {}
    );
    const container = _render(result);
    const chatMessages = container.container.querySelectorAll('.chat-message');
    expect(chatMessages.length).toBe(3);
    expect(container.container.querySelector('.collapsed-history-indicator')).not.toBeInTheDocument();
  });

  test('collapsed view shows pinned divider and last user message', () => {
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, false, () => {}
    );
    const container = _render(result);
    const divider = container.container.querySelector('.pinned-divider');
    expect(divider).toBeInTheDocument();
    const chatMessages = container.container.querySelectorAll('.chat-message');
    expect(chatMessages.length).toBe(1); // only the last user message (pinned)
    expect(chatMessages[0].classList.contains('user')).toBe(true);
  });
});
