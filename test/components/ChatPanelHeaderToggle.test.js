/**
 * Tests for ChatPanel Header Toggle Click Functionality
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;

describe('ChatPanel Header Toggle Click', () => {
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

  test('should have clickable chat-header', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    expect(chatHeader).toBeTruthy();
    expect(chatHeader.classList.contains('chat-header-clickable')).toBe(true);
  });

  test('should toggle to msg history display when clicking chat-header', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('聊天')).toBeInTheDocument();

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('msg历史记录')).toBeInTheDocument();
    expect(screen.getByText('暂无消息历史记录')).toBeInTheDocument();
  });

  test('should toggle back to Chat panel when clicking chat-header again', async () => {
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

    const chatHeaderMsg = screen.getByText('msg历史记录').closest('.chat-header');
    fireEvent.click(chatHeaderMsg);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('聊天')).toBeInTheDocument();
    expect(screen.getByText('开始对话')).toBeInTheDocument();
  });

  test('should not have separate toggle button', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const toggleButtons = screen.queryAllByRole('button', { name: /toggle|切换/i });
    expect(toggleButtons.length).toBe(0);
  });
});