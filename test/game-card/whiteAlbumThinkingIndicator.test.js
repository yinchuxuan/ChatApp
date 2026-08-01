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

    expect(screen.getByRole('status', { name: '思考中' })).toHaveTextContent('思考中……');

    rerender(React.createElement(Root, {
      React,
      state,
      emit: jest.fn(),
      ui: { isLoading: false }
    }));
    expect(screen.queryByRole('status', { name: '思考中' })).not.toBeInTheDocument();
  });

  test('animates the ellipsis and hides it when streaming text appears', () => {
    expect(rootCss).toContain('@keyframes wa2-thinking-dot');
    expect(rootCss).toMatch(/\.wa2-thinking-dots span \{[^}]*animation: wa2-thinking-dot 1\.2s/);
    expect(rootCss).toMatch(/\[data-gc-part="message-list"\][\s\S]*?> \[data-gc-part="message-row"\]\[data-role="assistant"\]:last-child[\s\S]*?\[data-gc-part="message-content"\]:not\(:empty\)/);
    expect(rootCss).toMatch(/\) \.wa2-thinking-indicator \{[^}]*opacity: 0;[^}]*visibility: hidden;/);
  });
});
