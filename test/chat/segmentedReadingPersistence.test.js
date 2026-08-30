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

  test('keeps an init-inserted first message on the same segment after reload', async () => {
    global.platformMock.getActiveGameCard.mockResolvedValue({
      success: true,
      card: {
        version: '1', id: 'segmented-init', name: 'Segmented Init',
        display: { segmentedReading: true, segmentSeparator: '\n' },
        rules: [{
          when: { phase: 'init' },
          then: [
            { type: 'insert', role: 'system', content: 'system prompt' },
            { type: 'insert', role: 'system', content: 'summary' },
            {
              type: 'insert', role: 'assistant', content: '第一段。\n第二段。\n第三段。',
              _meta: {
                visibility: 'user_visible',
                statePatchPlayback: { appliedPatchCount: 0, afterResponseApplied: true }
              }
            }
          ]
        }]
      }
    });
    global.platformMock.getChatHistory.mockResolvedValue({
      success: true, messages: [], gameState: {}, viewState: {}
    });
    const ChatPanel = require('../../src/renderer/ChatPanel.jsx').default;
    const first = render(React.createElement(ChatPanel));

    await screen.findByText('第一段。');
    fireEvent.click(first.container.querySelector('[data-gc-part="chat-panel"]'));
    await screen.findByText('第二段。');
    const saved = await waitFor(() => {
      const match = global.platformMock.saveChatHistory.mock.calls.find(call => (
        call[1]?.viewState?.reading?.segmentIndex === 1
      ));
      expect(match).toBeDefined();
      return match;
    });
    expect(new Set(saved[0].map(message => message.id)).size).toBe(3);
    const savedId = saved[0][2].id;
    expect(savedId).toEqual(expect.any(String));
    expect(saved[1].viewState.reading.messageId).toBe(savedId);

    first.unmount();
    global.platformMock.getChatHistory.mockResolvedValue({
      success: true, messages: saved[0], ...saved[1]
    });
    render(React.createElement(ChatPanel));

    await screen.findByText('第二段。');
    expect(screen.queryByText('第一段。')).toBeNull();
  });
});
