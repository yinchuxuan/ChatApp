/**
 * Tests for ChatPanel Clear Chat History
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;

describe('ChatPanel Clear Chat History', () => {
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

  test('should not show clear button when there are no messages', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.queryByTitle('清空聊天历史')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('清空聊天历史')).not.toBeInTheDocument();
  });

  test('should show clear button when there are messages', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Use the input to send a message that will add to messages array
    const input = screen.getByPlaceholderText('输入您的问题...');
    fireEvent.change(input, { target: { value: 'Hello' } });

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const sendBtn = screen.getByText('发送').closest('button');
    fireEvent.click(sendBtn);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // After sending a message, the clear button should appear
    const clearBtn = screen.queryByTitle('清空聊天历史');
    expect(clearBtn).toBeInTheDocument();
  });

  test('should hide clear button after clearing messages', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // First send a message to get the clear button to appear
    const input = screen.getByPlaceholderText('输入您的问题...');
    fireEvent.change(input, { target: { value: 'Hello' } });

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const sendBtn = screen.getByText('发送').closest('button');
    fireEvent.click(sendBtn);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // Clear button should be visible
    const clearBtn = screen.queryByTitle('清空聊天历史');
    expect(clearBtn).toBeInTheDocument();

    // Click clear button
    fireEvent.click(clearBtn);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Clear button should no longer be visible
    expect(screen.queryByTitle('清空聊天历史')).not.toBeInTheDocument();
  });

  test('clear button should not toggle to API request view', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Send a message
    const input = screen.getByPlaceholderText('输入您的问题...');
    fireEvent.change(input, { target: { value: 'Hello' } });

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const sendBtn = screen.getByText('发送').closest('button');
    fireEvent.click(sendBtn);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // Click clear button
    const clearBtn = screen.getByTitle('清空聊天历史');
    fireEvent.click(clearBtn);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Should still be in chat view (not API request view)
    expect(screen.getByText('聊天')).toBeInTheDocument();
    expect(screen.queryByText('API请求')).not.toBeInTheDocument();
  });

  test('clear button should have correct aria-label and title attributes', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    // Send a message to reveal clear button
    const input = screen.getByPlaceholderText('输入您的问题...');
    fireEvent.change(input, { target: { value: 'Test' } });

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const sendBtn = screen.getByText('发送').closest('button');
    fireEvent.click(sendBtn);

    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    const clearBtn = screen.getByLabelText('清空聊天历史');
    expect(clearBtn).toBeInTheDocument();
    expect(clearBtn.getAttribute('title')).toBe('清空聊天历史');
  });
});
