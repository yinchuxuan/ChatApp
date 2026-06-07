import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;
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
  const originalBgmPlayer = window.GameCardBgmPlayer;
  const originalBackgroundRuntime = window.GameCardBackgroundRuntime;

  beforeEach(() => {
    jest.clearAllMocks();
    bgmTokens.length = 0;
    backgroundTokens.length = 0;
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'key', modelName: 'gpt-4' }
    });
    electronAPI.getActiveGameCard.mockResolvedValue({ success: true, card: { id: 'card' } });
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'old' }],
      retryBaseMessages: [{ role: 'user', content: 'Q' }],
      retryBaseState: {}
    });
    window.GameCardBgmPlayer = TestBgmPlayer;
    window.GameCardBackgroundRuntime = TestBackgroundRuntime;
    global.fetch.mockResolvedValue(global.createStreamingMock('Retry body'));
  });

  afterEach(() => {
    window.GameCardBgmPlayer = originalBgmPlayer;
    window.GameCardBackgroundRuntime = originalBackgroundRuntime;
  });

  test('increments audio and background tokens when retry body starts', async () => {
    render(React.createElement(ChatPanel));
    await act(async () => { await Promise.resolve(); });

    fireEvent.click(screen.getByRole('button', { name: '重新生成回复' }));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(Math.max(...bgmTokens)).toBeGreaterThan(0);
    expect(Math.max(...backgroundTokens)).toBeGreaterThan(0);
  });
});
