/**
 * Integration tests for Msg History Display Card
 * Tests the full toggle flow and card rendering through ChatPanel
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;

describe('Msg History Display Card - Integration', () => {
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

  test('should show msg history card with messages after toggle', async () => {
    const sampleMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: sampleMessages
    });

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Toggle to msg history view
    const chatHeader = screen.getByText('未加载游戏卡').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Should show the card
    const card = document.querySelector('.msg-history-card');
    expect(card).toBeTruthy();

    // Should contain msgs JSON structure
    const jsonPre = document.querySelector('.msg-history-json');
    expect(jsonPre).toBeTruthy();
    const parsed = JSON.parse(jsonPre.textContent);
    expect(parsed).toHaveProperty('msgs');
    expect(parsed.msgs['0'].content).toBe('Hello');
    expect(parsed.msgs['1'].content).toBe('Hi there!');
  });

  test('should show empty state when no messages in history', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: []
    });

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('未加载游戏卡').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('暂无消息历史记录')).toBeInTheDocument();
  });

  test('msg history card should have consistent styling classes', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [{ role: 'user', content: 'test' }]
    });

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('未加载游戏卡').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const card = document.querySelector('.msg-history-card');
    expect(card).toBeTruthy();

    // Verify the card uses the same CSS variables as assistant cards
    // by checking the class is present (CSS vars applied via stylesheet)
    const pre = card.querySelector('.msg-history-json');
    expect(pre).toBeTruthy();
  });
});
