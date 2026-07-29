const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { fireEvent, render, screen } = require('@testing-library/react');
const { compileGameCardUiRootSource } = require('../../src/renderer/gameCard/uiRuntime');

const rootSource = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/ui/root.js'),
  'utf8'
);
const Root = compileGameCardUiRootSource(rootSource, React);
const state = { events: { queue: [], panel: { open: false, eventId: '' } } };

function renderRetryRoot(emit = jest.fn(() => true)) {
  const view = render(React.createElement(
    'div',
    { 'data-gc-part': 'chat-panel' },
    React.createElement(Root, {
      React,
      state,
      emit,
      ui: { canRetry: true, retrySource: '去第三音乐室继续练习。' }
    })
  ));
  return { ...view, emit, root: view.container.querySelector('.wa2-event-root') };
}

describe('white album 2 retry panel', () => {
  test('opens from right click and returns without changing the reading state', () => {
    const { root } = renderRetryRoot();

    fireEvent.contextMenu(root);

    expect(screen.getByRole('dialog', { name: '上一次行动' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '编辑上一次行动' }))
      .toHaveValue('去第三音乐室继续练习。');
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(enter);
    expect(enter.defaultPrevented).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '返回演出' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('opens from Escape and retries with the edited last action', () => {
    const { emit } = renderRetryRoot();

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.change(screen.getByRole('textbox', { name: '编辑上一次行动' }), {
      target: { value: '改为去找冬马。' }
    });
    fireEvent.click(screen.getByRole('button', { name: '重新生成' }));

    expect(emit).toHaveBeenCalledWith({
      type: 'chat.retry',
      content: '改为去找冬马。'
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('keeps the native editor context menu while paused', () => {
    const { root } = renderRetryRoot();
    fireEvent.contextMenu(root);
    const editor = screen.getByRole('textbox', { name: '编辑上一次行动' });
    const contextMenu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

    editor.dispatchEvent(contextMenu);

    expect(contextMenu.defaultPrevented).toBe(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('does not consume Enter from retry controls', () => {
    const { root } = renderRetryRoot();
    fireEvent.contextMenu(root);
    const button = screen.getByRole('button', { name: '返回演出' });
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true
    });

    button.dispatchEvent(enter);

    expect(enter.defaultPrevented).toBe(false);
  });
});
