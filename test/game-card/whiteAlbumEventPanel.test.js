const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
const { compileGameCardUiRootSource } = require('../../src/renderer/gameCard/uiRuntime');

const rootSource = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/ui/root.js'),
  'utf8'
);
const Root = compileGameCardUiRootSource(rootSource, React);
const closedPanel = { open: false, eventId: '', returnScene: { background: null, bgm: null } };

function sampleEvent() {
  return {
    id: 'sample-event',
    title: '雪菜的答复',
    time: '2007.10.26 放学后 星期五',
    background: 'event1',
    bgm: 'dream',
    body: '雪菜说“谢谢你”。春希可以选择如何回应她。\n\n第二段里，他又听见「隔壁的钢琴声」。',
    options: [
      { id: 'thank', label: '认真道谢', effects: { 'setsuna.affection': 2, 'touma.affection': -2 } },
      { id: 'light', label: '轻轻带过', effects: { 'setsuna.affection': -1 } }
    ]
  };
}

function eventState(panel = closedPanel) {
  return {
    setsuna: { affection: 99 },
    touma: { affection: 1 },
    audio: { bgm: panel.open ? 'dream' : 'daily' },
    visual: { background: panel.open ? 'event1' : 'school' },
    events: { queue: [sampleEvent(), { id: 'next-event' }], panel }
  };
}

describe('white album 2 event panel', () => {
  test('persists opening and closing an empty event panel', () => {
    const emit = jest.fn();
    const { container, rerender } = render(React.createElement(Root, {
      React,
      state: { events: { queue: [], panel: closedPanel } },
      emit
    }));

    expect(container.firstChild).toHaveAttribute('data-has-events', 'false');
    expect(container.querySelector('[role="region"]')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(screen.getByRole('button', { name: '打开事件' }));
    expect(emit).toHaveBeenLastCalledWith({
      type: 'game.script.run',
      name: 'eventControl',
      payload: { action: 'open' }
    });

    rerender(React.createElement(Root, {
      React,
      state: { events: { queue: [], panel: { ...closedPanel, open: true } } },
      emit
    }));
    const panel = screen.getByRole('region', { name: '事件' });
    expect(screen.getByRole('button', { name: '返回主剧情' })).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveFocus();
    expect(screen.getByText('当前无事件')).toBeInTheDocument();

    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(emit).toHaveBeenLastCalledWith({
      type: 'game.script.run', name: 'eventControl', payload: { action: 'close' }
    });
    rerender(React.createElement(Root, {
      React, state: { events: { queue: [], panel: closedPanel } }, emit
    }));
    expect(screen.getByRole('button', { name: '打开事件' })).toHaveFocus();
  });

  test('switches event media and restores the main scene on return or consume', () => {
    const emit = jest.fn();
    const initialState = eventState();
    const { container, rerender } = render(React.createElement(Root, { React, state: initialState, emit }));

    expect(screen.queryByRole('button', { name: '认真道谢' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '打开事件' }));
    expect(emit).toHaveBeenLastCalledWith({
      type: 'game.script.run',
      name: 'eventControl',
      payload: { action: 'open' }
    });

    const openPanel = {
      open: true,
      eventId: 'sample-event',
      returnScene: { background: 'school', bgm: 'daily' }
    };
    rerender(React.createElement(Root, { React, state: eventState(openPanel), emit }));
    expect(screen.getByRole('button', { name: '返回主剧情' })).toHaveAttribute('title', '返回主剧情');
    expect(screen.getByText('2007.10.26 放学后 星期五')).toBeInTheDocument();
    expect(container.querySelector('.wa2-event-backdrop')).toBeNull();
    expect(container.querySelector('.wa2-event-body .quoted-text')).toHaveTextContent('“谢谢你”');
    expect(container.querySelectorAll('.wa2-event-body p')).toHaveLength(2);

    const content = container.querySelector('.wa2-event-content');
    Object.defineProperty(content, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(content, 'clientHeight', { configurable: true, value: 320 });
    fireEvent.wheel(container.querySelector('.wa2-event-panel'), { deltaY: 120 });
    expect(content.scrollTop).toBe(120);

    fireEvent.click(screen.getByRole('button', { name: '返回主剧情' }));
    expect(emit).toHaveBeenLastCalledWith({
      type: 'game.script.run',
      name: 'eventControl',
      payload: { action: 'close' }
    });

    fireEvent.click(screen.getByRole('button', { name: '认真道谢' }));
    expect(emit).toHaveBeenLastCalledWith({
      type: 'game.script.run',
      name: 'eventControl',
      payload: { action: 'consume', eventId: 'sample-event', optionId: 'thank' }
    });
  });
});
