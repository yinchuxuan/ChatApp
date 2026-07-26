import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import ChatPanel from '../../src/renderer/ChatPanel.jsx';

const platformMock = global.platformMock;
const bgmRequests = [];
const backgroundRequests = [];

function TestBgmPlayer({ updateRequest }) {
  if (updateRequest) bgmRequests.push(updateRequest.id);
  return React.createElement('div', { 'data-testid': 'bgm-request' });
}

function TestBackgroundRuntime({ backgroundRequest }) {
  if (backgroundRequest) backgroundRequests.push(backgroundRequest.id);
  return React.createElement('div', { 'data-testid': 'background-request' });
}

describe('ChatPanel retry stream start runtime token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bgmRequests.length = 0;
    backgroundRequests.length = 0;
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

  test('requests audio and background updates when retry body starts', async () => {
    render(React.createElement(ChatPanel, {
      BgmPlayer: TestBgmPlayer,
      BackgroundRuntime: TestBackgroundRuntime
    }));
    await screen.findByText('gpt-4');
    await waitFor(() => expect(backgroundRequests.length).toBeGreaterThan(0));
    const initialBackground = Math.max(...backgroundRequests);
    const initialBgm = Math.max(...bgmRequests);

    fireEvent.click(screen.getByRole('button', { name: '重新生成回复' }));
    await waitFor(() => {
      expect(Math.max(...bgmRequests)).toBeGreaterThan(initialBgm);
      expect(Math.max(...backgroundRequests)).toBeGreaterThan(initialBackground);
    });
  });

  test('does not auto-update presentation when the card opts out', async () => {
    platformMock.getActiveGameCard.mockResolvedValue({
      success: true,
      card: {
        version: '1',
        id: 'card',
        name: 'Card',
        presentation: { autoUpdateOnFirstToken: false },
        rules: []
      }
    });
    render(React.createElement(ChatPanel, {
      BgmPlayer: TestBgmPlayer,
      BackgroundRuntime: TestBackgroundRuntime
    }));
    await screen.findByText('gpt-4');
    await waitFor(() => expect(backgroundRequests.length).toBeGreaterThan(0));
    const initialBackground = Math.max(...backgroundRequests);
    const initialBgm = Math.max(...bgmRequests);

    fireEvent.click(screen.getByRole('button', { name: '重新生成回复' }));
    await screen.findByText('Retry body');

    expect(Math.max(...bgmRequests)).toBe(initialBgm);
    expect(Math.max(...backgroundRequests)).toBe(initialBackground);
  });
});
