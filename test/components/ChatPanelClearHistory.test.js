import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;

describe('ChatPanel without header clear history action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    global.fetch = jest.fn().mockResolvedValue(global.createStreamingMock('Test response'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not render the removed clear button before or after messages', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.queryByTitle('清空聊天历史')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('清空聊天历史')).not.toBeInTheDocument();

    const input = screen.getByPlaceholderText('输入您的回答...');
    fireEvent.change(input, { target: { value: 'Hello' } });

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const sendBtn = document.querySelector('button[type="submit"]');
    fireEvent.click(sendBtn);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.queryByTitle('清空聊天历史')).not.toBeInTheDocument();
    expect(document.querySelector('.chat-header-clear-btn')).toBeNull();
  });

  test('keeps game card import and session buttons in the title control', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const titleControl = document.querySelector('.game-card-title-control');
    expect(titleControl).not.toBeNull();
    expect(titleControl.querySelector('.chat-session-btn')).not.toBeNull();
    expect(titleControl.querySelector('.game-card-import-btn')).not.toBeNull();
  });
});
