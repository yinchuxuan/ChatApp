/**
 * Tests for ChatPanel API Request Display after Message Submission
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;

describe('ChatPanel API Request Display', () => {
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

  test('should show API request content after sending message', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText('输入您的问题...');
    fireEvent.change(input, { target: { value: 'test question' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('API请求')).toBeInTheDocument();
    expect(screen.getByText('最后一次 API 请求消息')).toBeInTheDocument();

    const apiRequestContent = document.querySelector('.chat-api-request-content');
    expect(apiRequestContent).toBeTruthy();
    expect(apiRequestContent.textContent).toContain('test question');
  });

  test('should be able to toggle even when no API request history', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: '', apiKey: '', modelName: '' }
    });

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

    expect(screen.getByText('API请求')).toBeInTheDocument();
    expect(screen.getByText('暂无 API 请求历史')).toBeInTheDocument();
    expect(screen.getByText('发送消息后将显示 API 请求内容')).toBeInTheDocument();

    const chatHeaderApi = screen.getByText('API请求').closest('.chat-header');
    fireEvent.click(chatHeaderApi);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('聊天')).toBeInTheDocument();
  });

  test('should not duplicate user messages in API request', async () => {
    global.fetch.mockImplementation(async (url, options) => {
      const requestBody = JSON.parse(options.body);
      const userMessages = requestBody.messages.filter(m => m.role === 'user');

      expect(userMessages.length).toBe(1);
      expect(userMessages[0].content).toBe('test question');

      return global.createStreamingMock('Test response');
    });

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText('输入您的问题...');
    fireEvent.change(input, { target: { value: 'test question' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(global.fetch).toHaveBeenCalled();
  });
});
