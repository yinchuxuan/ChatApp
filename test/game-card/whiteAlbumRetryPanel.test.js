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
function renderRetryRoot(emit = jest.fn(() => true), ui = {}) {
  const view = render(React.createElement(
    'div',
    { 'data-gc-part': 'chat-panel' },
    React.createElement(Root, {
      React,
      emit,
      ui: { canRetry: true, retrySource: '去第三音乐室继续练习。', ...ui }
    })
  ));
  return { ...view, emit, root: view.container.querySelector('.wa2-ui-root') };
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

  test('opens from Space and retries with the edited last action', () => {
    const { emit } = renderRetryRoot();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
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

  test('keeps Space available in editable controls', () => {
    const { root } = renderRetryRoot();
    const input = document.createElement('textarea');
    root.appendChild(input);
    const space = new KeyboardEvent('keydown', {
      key: ' ', code: 'Space', bubbles: true, cancelable: true
    });

    input.dispatchEvent(space);

    expect(space.defaultPrevented).toBe(false);
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

  test('uses the left and right arrow keys for reading navigation', () => {
    const emit = jest.fn(() => true);
    renderRetryRoot(emit, {
      reading: { canPrevious: true, canNext: true }
    });

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(emit).toHaveBeenNthCalledWith(1, { type: 'reading.previous' });
    expect(emit).toHaveBeenNthCalledWith(2, { type: 'reading.next' });
  });
});
