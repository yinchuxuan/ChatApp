const React = require('react');
const { render, fireEvent } = require('@testing-library/react');
const renderers = require('../../src/components/ChatPanelMessageRenderers');
const MessageCollapseRenderer = require('../../src/components/MessageCollapseRenderer');

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

function renderMarkdown(text) {
  return React.createElement('div', { className: 'chat-message-bubble' }, text);
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

  test('streaming thinking reopens by clicking streamed content after hidden', () => {
    const setShowStreamThinking = jest.fn();
    const { container } = render(renderers.renderAssistantMsg(
      React,
      'partial answer',
      0,
      true,
      { displayedCount: 7 },
      'stream reasoning',
      false,
      setShowStreamThinking,
      jest.fn(),
      window.marked,
      window.DOMPurify,
      value => value
    ));

    expect(container.querySelector('.chat-thinking-text')).toBeNull();
    expect(container.querySelector('.chat-bubble-content').textContent).toBe('partial');
    fireEvent.click(container.querySelector('.chat-message-bubble.bubble-clickable'));
    expect(setShowStreamThinking).toHaveBeenCalled();
    expect(setShowStreamThinking.mock.calls[0][0](false)).toBe(true);
  });

  test('toggles original assistant index after hidden messages are filtered', () => {
    const toggle = jest.fn();
    const renderAssistantMsg = (msg, idx, isStreaming) => renderers.renderAssistantMsg(
      React, msg, idx, isStreaming, { displayedCount: 0 }, '', true, jest.fn(),
      toggle, window.marked, window.DOMPurify, value => value
    );
    const result = renderers.renderMessages(
      React,
      [
        { role: 'system', content: 'rules', _meta: { visibility: 'llm_only' } },
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'answer', _thinking: 'reasoning' }
      ],
      false, {}, null, true, renderMarkdown, renderAssistantMsg, () => null,
      null, true, jest.fn(), { apiUrl: 'http://api.example.com' }
    );

    const { container } = render(result);
    fireEvent.click(container.querySelector('.chat-message-bubble.bubble-clickable'));
    expect(toggle).toHaveBeenCalledWith(2);
  });

  test('collapsed renderer toggles original assistant index after hidden messages', () => {
    const toggle = jest.fn();
    const renderAssistantMsg = (msg, idx, isStreaming) => renderers.renderAssistantMsg(
      React, msg, idx, isStreaming, { displayedCount: 0 }, '', true, jest.fn(),
      toggle, window.marked, window.DOMPurify, value => value
    );
    const result = renderers.renderMessages(
      React,
      [
        { role: 'system', content: 'rules', _meta: { visibility: 'llm_only' } },
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'answer', _thinking: 'reasoning' }
      ],
      false, {}, null, true, renderMarkdown, renderAssistantMsg, () => null,
      MessageCollapseRenderer, true, jest.fn(), { apiUrl: 'http://api.example.com' }
    );

    const { container } = render(result);
    fireEvent.click(container.querySelector('.chat-message-bubble.bubble-clickable'));
    expect(toggle).toHaveBeenCalledWith(2);
  });
});
