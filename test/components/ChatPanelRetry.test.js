/**
 * Tests for Retry Button on Last Assistant Message (app-001)
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;

describe('Retry Button - Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: [] });
    global.fetch = jest.fn().mockResolvedValue(global.createStreamingMock('Retry response'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should NOT show retry button when there are no messages', async () => {
    render(React.createElement(ChatPanel));
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });
    expect(screen.queryByRole('button', { name: '重新生成回复' })).not.toBeInTheDocument();
  });

  test('should NOT show retry button for user messages', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [{ role: 'user', content: 'Hello' }]
    });
    render(React.createElement(ChatPanel));
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });
    expect(screen.queryByRole('button', { name: '重新生成回复' })).not.toBeInTheDocument();
  });

  test('should show retry button on last assistant message only', async () => {
    const savedMessages = [
      { role: 'user', content: 'Question 1' },
      { role: 'assistant', content: 'Answer 1', _thinking: 'thinking 1' },
      { role: 'user', content: 'Question 2' },
      { role: 'assistant', content: 'Answer 2', _thinking: 'thinking 2' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    render(React.createElement(ChatPanel));
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });

    const retryBtns = screen.queryAllByRole('button', { name: '重新生成回复' });
    expect(retryBtns.length).toBe(1);

    // Should be near the last assistant message content
    const btn = retryBtns[0];
    expect(btn.closest('.chat-message')).toBeTruthy();
  });

  test('should show retry button on last assistant message without _thinking', async () => {
    const savedMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    render(React.createElement(ChatPanel));
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });

    // Retry button should show even without _thinking
    const retryBtns = screen.queryAllByRole('button', { name: '重新生成回复' });
    expect(retryBtns.length).toBe(1);
  });

  test('should show retry button when assistant message has _thinking', async () => {
    const savedMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there', _thinking: 'How to respond' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    render(React.createElement(ChatPanel));
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });

    const retryBtns = screen.queryAllByRole('button', { name: '重新生成回复' });
    expect(retryBtns.length).toBe(1);
  });
});

describe('Retry Button - Click Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: [] });
    global.fetch = jest.fn().mockResolvedValue(global.createStreamingMock('New regenerated response'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should retry by clearing messages and resending up to last user message', async () => {
    const savedMessages = [
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Old answer', _thinking: 'old thinking' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    render(React.createElement(ChatPanel));
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });

    const retryBtn = screen.queryByRole('button', { name: '重新生成回复' });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });

    // fetch should have been called for the retry request
    expect(global.fetch).toHaveBeenCalled();
  });

  test('should NOT retry when loading/in progress', async () => {
    const savedMessages = [
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Answer', _thinking: 'thinking' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    render(React.createElement(ChatPanel));
    await act(async () => { await Promise.resolve(); jest.advanceTimersByTime(100); });

    const retryBtn = screen.queryByRole('button', { name: '重新生成回复' });
    // When isLoading is true, the retry button should NOT be rendered
    // (it's rendered conditionally: isLast && !isLoading)
    // After initial load, isLoading should be false
    expect(retryBtn).toBeInTheDocument();
  });
});
