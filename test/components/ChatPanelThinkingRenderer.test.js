const React = require('react');
const { render, fireEvent } = require('@testing-library/react');
const renderers = require('../../src/components/ChatPanelMessageRenderers');

function renderAssistant(msg, toggle = jest.fn()) {
  return render(renderers.renderAssistantMsg(
    React,
    msg,
    0,
    false,
    null,
    '',
    false,
    jest.fn(),
    toggle,
    window.marked,
    window.DOMPurify,
    value => value
  ));
}

describe('ChatPanel thinking renderer', () => {
  test('adds clickable class and toggles stored thinking messages', () => {
    const toggle = jest.fn();
    const { container } = renderAssistant({
      role: 'assistant',
      content: 'Visible **answer**',
      _thinking: 'Hidden reasoning'
    }, toggle);

    const bubble = container.querySelector('.chat-message-bubble');
    expect(bubble.classList.contains('bubble-clickable')).toBe(true);
    expect(container.querySelector('.chat-thinking-text')).toBeNull();

    fireEvent.click(bubble);
    expect(toggle).toHaveBeenCalledWith(0);
    expect(container.querySelector('.chat-bubble-content').innerHTML).toContain('<strong>answer</strong>');
  });

  test('renders thinking text only when the message is expanded', () => {
    const { container } = renderAssistant({
      role: 'assistant',
      content: 'Answer',
      _thinking: 'Hidden reasoning',
      _thinkingVisible: true
    });

    expect(container.querySelector('.chat-thinking-text').textContent).toBe('Hidden reasoning');
  });

  test('keeps normal assistant messages non-clickable', () => {
    const { container } = renderAssistant({ role: 'assistant', content: 'Plain answer' });

    const bubble = container.querySelector('.chat-message-bubble');
    expect(bubble.classList.contains('bubble-clickable')).toBe(false);
  });
});
