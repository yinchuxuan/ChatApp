const React = require('react');
const { fireEvent, render, screen, waitFor } = require('@testing-library/react');

const messages = [
  { id: 'user', role: 'user', content: '继续。' },
  { id: 'reply', role: 'assistant', content: '第一段。\n\n第二段。\n\n第三段。' }
];

function segmentedCard() {
  return {
    success: true,
    card: {
      version: '1',
      id: 'segmented-persistence',
      name: 'Segmented Persistence',
      display: { segmentedReading: true },
      rules: []
    }
  };
}

describe('segmented reading persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.platformMock.getModelConfig.mockResolvedValue({ success: true, config: {} });
    global.platformMock.getActiveGameCard.mockResolvedValue(segmentedCard());
    global.platformMock.getChatHistory.mockResolvedValue({
      success: true,
      messages,
      gameState: {},
      viewState: { reading: { messageId: 'reply', segmentIndex: 1 } }
    });
  });

  test('restores the saved message segment and persists the next segment', async () => {
    const ChatPanel = require('../../src/renderer/ChatPanel.jsx').default;
    const { container } = render(React.createElement(ChatPanel));

    await screen.findByText('第二段。');
    expect(screen.queryByText('第一段。')).toBeNull();
    fireEvent.click(container.querySelector('[data-gc-part="chat-panel"]'));
    expect(screen.getByText('第三段。')).toBeInTheDocument();

    await waitFor(() => expect(global.platformMock.saveChatHistory.mock.calls.some(call => (
      call[1]?.viewState?.reading?.messageId === 'reply'
      && call[1]?.viewState?.reading?.segmentIndex === 2
    ))).toBe(true));
  });
});
