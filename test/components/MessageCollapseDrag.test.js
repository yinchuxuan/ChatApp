/**
 * Tests for drag-to-expand interaction in MessageCollapseRenderer
 * Verifies mouse drag gesture triggers history expansion
 */

const MessageCollapseRenderer = require('../../src/components/MessageCollapseRenderer.js');
const R = require('react');
const { render: _render, fireEvent } = require('@testing-library/react');

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
    const { container } = _render(result);
    const view = container.querySelector('.collapsed-message-view');
    expect(view).toBeInTheDocument();

    fireEvent.mouseDown(view, { button: 0, clientY: 100 });
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 180 }));

    expect(mockOnExpand).toHaveBeenCalled();
  });

  test('onExpand does not fire when drag is too small', () => {
    const mockOnExpand = jest.fn();
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, false, mockOnExpand
    );
    const { container } = _render(result);
    const view = container.querySelector('.collapsed-message-view');

    fireEvent.mouseDown(view, { button: 0, clientY: 100 });
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 105 }));
    document.dispatchEvent(new MouseEvent('mouseup'));

    expect(mockOnExpand).not.toHaveBeenCalled();
  });

  test('onExpand does not fire when already expanded', () => {
    const mockOnExpand = jest.fn();
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, true, mockOnExpand
    );
    const { container } = _render(result);
    const view = container.querySelector('.collapsed-message-view');

    // No onMouseDown when already expanded
    fireEvent.mouseDown(view, { button: 0, clientY: 100 });
    document.dispatchEvent(new MouseEvent('mousemove', { clientY: 200 }));

    expect(mockOnExpand).not.toHaveBeenCalled();
  });

  test('expanded view renders all prior history messages', () => {
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, true, () => {}
    );
    const { container } = _render(result);
    const chatMessages = container.querySelectorAll('.chat-message');
    expect(chatMessages.length).toBe(3);
    expect(container.querySelector('.collapsed-history-indicator')).not.toBeInTheDocument();
  });

  test('collapsed view shows pinned divider and last user message', () => {
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, false, () => {}
    );
    const { container } = _render(result);
    const divider = container.querySelector('.pinned-divider');
    expect(divider).toBeInTheDocument();
    const chatMessages = container.querySelectorAll('.chat-message');
    expect(chatMessages.length).toBe(1);
    expect(chatMessages[0].classList.contains('user')).toBe(true);
  });
});
