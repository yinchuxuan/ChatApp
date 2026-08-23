const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { render, screen } = require('@testing-library/react');
const { compileGameCardUiRootSource } = require('../../src/renderer/gameCard/uiRuntime');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const rootSource = fs.readFileSync(path.join(cardDir, 'ui/root.js'), 'utf8');
const rootCss = fs.readFileSync(path.join(cardDir, 'ui/root.css'), 'utf8');
const Root = compileGameCardUiRootSource(rootSource, React);
const state = { events: { queue: [], panel: { open: false, eventId: '' } } };

describe('white album thinking indicator', () => {
  test('shows only while a reply is waiting for visible text', () => {
    const { rerender } = render(React.createElement(Root, {
      React,
      state,
      emit: jest.fn(),
      ui: { isLoading: true }
    }));

    expect(screen.getByRole('status', { name: '思考中，等待回复' }))
      .toHaveTextContent('思考中……');

    rerender(React.createElement(Root, {
      React,
      state,
      emit: jest.fn(),
      ui: { isLoading: false }
    }));
    expect(screen.queryByRole('status', { name: '思考中，等待回复' })).not.toBeInTheDocument();
  });

  test('uses the latest user input without its injected turn context', () => {
    render(React.createElement(Root, {
      React,
      state,
      messages: [
        { role: 'user', content: '较早的行动' },
        { role: 'assistant', content: '上一轮回复' },
        {
          role: 'user',
          content: '去找冬马\n\n---\n<wa2_turn_context>内部上下文</wa2_turn_context>'
        }
      ],
      emit: jest.fn(),
      ui: { isLoading: true }
    }));

    const indicator = screen.getByRole('status', { name: '去找冬马，等待回复' });
    expect(indicator).toHaveTextContent('去找冬马……');
    expect(indicator).not.toHaveTextContent('内部上下文');
  });

  test('animates the ellipsis and hides it when streaming text appears', () => {
    expect(rootCss).toContain('@keyframes wa2-thinking-dot');
    expect(rootCss).toMatch(/\.wa2-thinking-indicator \{[^}]*font-size: clamp\(16px, 1\.15vw, 18px\);[^}]*font-weight: 600;/);
    expect(rootCss).toMatch(/\.wa2-thinking-dots span \{[^}]*animation: wa2-thinking-dot 1\.2s/);
    expect(rootCss).toMatch(/\.wa2-thinking-label \{[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;/);
    expect(rootCss).toMatch(/\[data-gc-part="message-list"\][\s\S]*?> \[data-gc-part="message-row"\]\[data-role="assistant"\]:last-child[\s\S]*?\[data-gc-part="message-content"\]:not\(:empty\)/);
    expect(rootCss).toMatch(/\) \.wa2-thinking-indicator \{[^}]*opacity: 0;[^}]*visibility: hidden;/);
  });
});
