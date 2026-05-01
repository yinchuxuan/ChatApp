/**
 * Tests for ChatPanel Msg History Display after Message Submission
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;

describe('ChatPanel Msg History Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: [] });
    global.fetch = jest.fn().mockResolvedValue(global.createStreamingMock('Test response'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should show msg history content after sending message and toggling', async () => {
    const savedMessages = [
      { role: 'user', content: 'test question' },
      { role: 'assistant', content: 'Test response', _thinking: 'thinking content' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('msg历史记录')).toBeInTheDocument();
    expect(electronAPI.getChatHistory).toHaveBeenCalled();

    // Verify the card is rendered with msgs JSON structure
    const card = document.querySelector('.msg-history-card');
    expect(card).toBeTruthy();
    const jsonPre = document.querySelector('.msg-history-json');
    expect(jsonPre).toBeTruthy();
    const parsed = JSON.parse(jsonPre.textContent);
    expect(parsed).toHaveProperty('msgs');
    expect(parsed.msgs['0'].content).toContain('test question');
    expect(parsed.msgs['1'].content).toContain('Test response');
    expect(parsed.msgs['1'].role).toBe('assistant');
  });

  test('should show empty state when no msg history', async () => {
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: [] });

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('msg历史记录')).toBeInTheDocument();
    expect(screen.getByText('暂无消息历史记录')).toBeInTheDocument();

    const chatHeaderMsgHistory = screen.getByText('msg历史记录').closest('.chat-header');
    fireEvent.click(chatHeaderMsgHistory);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('聊天')).toBeInTheDocument();
  });

  test('should display full msg JSON structure from history file', async () => {
    const savedMessages = [
      { role: 'user', content: 'Hello', isError: false },
      { role: 'assistant', content: 'Hi there', _thinking: 'How to respond...' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Verify msgs JSON structure contains all message data
    const jsonPre = document.querySelector('.msg-history-json');
    const parsed = JSON.parse(jsonPre.textContent);
    expect(parsed).toHaveProperty('msgs');
    expect(parsed.msgs['0'].role).toBe('user');
    expect(parsed.msgs['0'].content).toBe('Hello');
    expect(parsed.msgs['1'].role).toBe('assistant');
    expect(parsed.msgs['1'].content).toBe('Hi there');
  });

  test('should handle getChatHistory failure gracefully', async () => {
    electronAPI.getChatHistory.mockResolvedValue({ success: false, error: 'Read error', messages: [] });

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Should show empty state on failure
    expect(screen.getByText('暂无消息历史记录')).toBeInTheDocument();
  });

  test('should not load msg history from API request but from file', async () => {
    const savedMessages = [
      { role: 'user', content: 'test question' },
      { role: 'assistant', content: 'Test response', _thinking: 'thinking content' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Send a message to populate chat
    const input = screen.getByPlaceholderText('输入您的回答...');
    fireEvent.change(input, { target: { value: 'test question' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });
    await waitFor(() => {
      const responses = screen.getAllByText('Test response');
      expect(responses.length).toBeGreaterThan(0);
    });
    electronAPI.getChatHistory.mockClear();
    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });
    expect(electronAPI.getChatHistory).toHaveBeenCalled();
    const card = document.querySelector('.msg-history-card');
    expect(card).toBeTruthy();
    const jsonPre = document.querySelector('.msg-history-json');
    const parsed = JSON.parse(jsonPre.textContent);
    expect(parsed).toHaveProperty('msgs');
    expect(Object.keys(parsed.msgs).length).toBe(2);
  });
});
