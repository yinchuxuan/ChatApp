const React = require('react');
const { render } = require('@testing-library/react');
const ChatPanelMessageRenderers = require('../../src/components/ChatPanelMessageRenderers');
const MessageCollapseRenderer = require('../../src/components/MessageCollapseRenderer');

function renderMarkdown(text) {
  return React.createElement('div', { className: 'content' }, text);
}

function renderAssistantMsg(msg) {
  return React.createElement('div', { className: 'assistant-content' }, msg.content);
}

describe('chat panel message visibility', () => {
  test('main dialogue renderer hides system messages', () => {
    const result = ChatPanelMessageRenderers.renderMessages(
      React,
      [
        { role: 'system', content: 'hidden rules' },
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'ok' }
      ],
      false,
      {},
      null,
      true,
      renderMarkdown,
      renderAssistantMsg,
      () => null,
      null,
      false,
      jest.fn(),
      { apiUrl: 'http://api.example.com' }
    );

    const container = render(result);
    expect(container.container.textContent).toContain('hello');
    expect(container.container.textContent).toContain('ok');
    expect(container.container.textContent).not.toContain('hidden rules');
  });

  test('collapsed dialogue renderer hides system messages', () => {
    const result = MessageCollapseRenderer.render(
      React,
      [
        { role: 'system', content: 'hidden rules' },
        { role: 'user', content: 'hello' },
        { role: 'assistant', content: 'ok' }
      ],
      false,
      {},
      renderMarkdown,
      renderAssistantMsg,
      () => null,
      true,
      jest.fn()
    );

    const container = render(result);
    expect(container.container.textContent).toContain('hello');
    expect(container.container.textContent).toContain('ok');
    expect(container.container.textContent).not.toContain('hidden rules');
  });
});
