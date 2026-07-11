import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import ChatPanel from '../../src/ChatPanel.jsx';

const platformMock = global.platformMock;
const bgmTokens = [];
const backgroundTokens = [];

function TestBgmPlayer({ resumeToken }) {
  bgmTokens.push(resumeToken);
  return React.createElement('div', { 'data-testid': 'bgm-token' }, resumeToken);
}

function TestBackgroundRuntime({ revealToken }) {
  backgroundTokens.push(revealToken);
  return React.createElement('div', { 'data-testid': 'background-token' }, revealToken);
}

describe('ChatPanel retry stream start runtime token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bgmTokens.length = 0;
    backgroundTokens.length = 0;
    platformMock.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'key', modelName: 'gpt-4' }
    });
    platformMock.getActiveGameCard.mockResolvedValue({
      success: true,
      card: { version: '1', id: 'card', name: 'Card', rules: [] }
    });
    platformMock.getChatHistory.mockResolvedValue({
      success: true,
      messages: [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'old' }],
      retryBaseMessages: [{ role: 'user', content: 'Q' }],
      retryBaseState: {}
    });
    global.fetch.mockResolvedValue(global.createStreamingMock('Retry body'));
  });

  test('increments audio and background tokens when retry body starts', async () => {
    render(React.createElement(ChatPanel, {
      BgmPlayer: TestBgmPlayer,
      BackgroundRuntime: TestBackgroundRuntime
    }));
    await screen.findByText('gpt-4');

    fireEvent.click(screen.getByRole('button', { name: '重新生成回复' }));
    await waitFor(() => {
      expect(Math.max(...bgmTokens)).toBeGreaterThan(0);
      expect(Math.max(...backgroundTokens)).toBeGreaterThan(0);
    });
  });
});
