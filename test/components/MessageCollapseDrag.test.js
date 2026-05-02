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

    const mouseDownEvent = new MouseEvent('mousedown', { button: 0, clientY: 100, bubbles: true });
    view.dispatchEvent(mouseDownEvent);
    const mouseMoveEvent = new MouseEvent('mousemove', { clientY: 120, bubbles: true });
    document.dispatchEvent(mouseMoveEvent);

    expect(mockOnExpand).toHaveBeenCalled();
  });

  test('onExpand does not fire when drag is too small', () => {
    const mockOnExpand = jest.fn();
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, false, mockOnExpand
    );
    const container = _render(result);
    const view = container.container.querySelector('.collapsed-message-view');

    const mouseDownEvent = new MouseEvent('mousedown', { button: 0, clientY: 100, bubbles: true });
    view.dispatchEvent(mouseDownEvent);
    const mouseMoveEvent = new MouseEvent('mousemove', { clientY: 105, bubbles: true });
    document.dispatchEvent(mouseMoveEvent);
    const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true });
    document.dispatchEvent(mouseUpEvent);

    expect(mockOnExpand).not.toHaveBeenCalled();
  });

  test('onExpand does not fire when already expanded', () => {
    const mockOnExpand = jest.fn();
    const result = MessageCollapseRenderer.render(
      R, mockMsgs, false, mockTw, renderMarkdown, renderAssistantMsg, true, mockOnExpand
    );
    const container = _render(result);
    const view = container.container.querySelector('.collapsed-message-view');

    const mouseDownEvent = new MouseEvent('mousedown', { button: 0, clientY: 100, bubbles: true });
    view.dispatchEvent(mouseDownEvent);
    const mouseMoveEvent = new MouseEvent('mousemove', { clientY: 200, bubbles: true });
    document.dispatchEvent(mouseMoveEvent);

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
});
