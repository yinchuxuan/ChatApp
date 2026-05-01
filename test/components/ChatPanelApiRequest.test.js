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

    // Verify only raw JSON is displayed in <pre> elements
    const preElements = document.querySelectorAll('.chat-history pre');
    expect(preElements.length).toBe(2);
    expect(preElements[0].textContent).toContain('test question');
    expect(preElements[1].textContent).toContain('Test response');
    expect(preElements[1].textContent).toContain('thinking content');
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

    // Verify JSON structures are displayed in <pre> elements
    const preElements = document.querySelectorAll('.chat-history pre');
    const firstMsgJson = JSON.parse(preElements[0].textContent);
    expect(firstMsgJson.role).toBe('user');
    expect(firstMsgJson.content).toBe('Hello');
    expect(firstMsgJson.isError).toBe(false);

    const secondMsgJson = JSON.parse(preElements[1].textContent);
    expect(secondMsgJson.role).toBe('assistant');
    expect(secondMsgJson._thinking).toBe('How to respond...');
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
    const input = screen.getByPlaceholderText('输入您的问题...');
    fireEvent.change(input, { target: { value: 'test question' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      const responses = screen.getAllByText('Test response');
      expect(responses.length).toBeGreaterThan(0);
    });

    // Clear mock to check if it's called again on toggle
    electronAPI.getChatHistory.mockClear();

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Should call getChatHistory to read from file, not use API request data
    expect(electronAPI.getChatHistory).toHaveBeenCalled();
    // Returned messages should be from file (which we mocked)
    const preElements = document.querySelectorAll('.chat-history pre');
    expect(preElements.length).toBe(2);
  });
});
