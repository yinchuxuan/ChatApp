const React = require('react');
const { act, fireEvent, render, screen } = require('@testing-library/react');

function activeCard(segmentedReading) {
  return {
    success: true,
    card: {
      version: '1',
      id: segmentedReading ? 'segmented-card' : 'normal-card',
      name: 'History Card',
      display: { segmentedReading },
      rules: []
    }
  };
}

const messages = [
  { id: 'old', role: 'assistant', content: '旧回复。' },
  { id: 'user', role: 'user', content: '继续。' },
  { id: 'latest', role: 'assistant', content: '最新回复。' }
];

async function renderHistory(segmentedReading) {
  global.platformMock.getActiveGameCard.mockResolvedValue(activeCard(segmentedReading));
  global.platformMock.getChatHistory.mockResolvedValue({ success: true, messages, gameState: {} });
  const ChatPanel = require('../../src/renderer/ChatPanel.jsx').default;
  const result = render(React.createElement(ChatPanel));
  await screen.findByText('最新回复。');
  return result.container.querySelector('.collapsed-message-view');
}

function pullUp(view) {
  for (let index = 0; index < 5; index += 1) {
    fireEvent.wheel(view, { deltaY: -100 });
  }
  act(() => jest.advanceTimersByTime(100));
}

describe('segmented reading history expansion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.platformMock.getModelConfig.mockResolvedValue({ success: true, config: {} });
  });

  afterEach(() => jest.useRealTimers());

  test('ignores the collapsed-history gesture in segmented reading mode', async () => {
    const view = await renderHistory(true);
    jest.useFakeTimers();
    pullUp(view);

    expect(view).not.toHaveClass('expanded');
    expect(screen.queryByText('旧回复。')).toBeNull();
  });

  test('keeps the collapsed-history gesture in normal mode', async () => {
    const view = await renderHistory(false);
    jest.useFakeTimers();
    pullUp(view);

    expect(view).toHaveClass('expanded');
    expect(screen.getByText('旧回复。')).toBeInTheDocument();
  });
});
