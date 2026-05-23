import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import ChatInputArea from '../../src/ChatInputArea.jsx';

function renderInputArea(props = {}) {
  const tw = {
    startStreaming: jest.fn(),
    pushContent: jest.fn(),
    finishStreaming: jest.fn(),
    getAccumulatedContent: jest.fn(() => 'ok'),
    getThinkingContent: jest.fn(() => ''),
    clearStreaming: jest.fn(),
    reset: jest.fn()
  };

  return {
    tw,
    setMessages: jest.fn(),
    ...render(React.createElement(ChatInputArea, {
      messages: [],
      setMessages: jest.fn(),
      modelConfig: {
        apiUrl: 'https://api.example.com/v1',
        apiKey: 'key',
        modelName: 'gpt-4'
      },
      isLoading: false,
      setIsLoading: jest.fn(),
      tw,
      setShowStreamThinking: jest.fn(),
      isInputHovered: false,
      setIsInputHovered: jest.fn(),
      isInputTriggerHovered: false,
      setIsInputTriggerHovered: jest.fn(),
      ...props
    }))
  };
}

describe('ChatInputArea game card pre_send integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue(global.createStreamingMock('ok'));
  });

  test('does not modify request messages when no game card is active', async () => {
    window.electronAPI.getActiveGameCard.mockResolvedValue({ success: true, card: null });
    renderInputArea();

    fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  test('keeps normal message append behavior when no game card is active', async () => {
    const setMessages = jest.fn();
    window.electronAPI.getActiveGameCard.mockResolvedValue({ success: true, card: null });
    renderInputArea({ setMessages });

    fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(setMessages).toHaveBeenCalledTimes(2));
    expect(setMessages.mock.calls[0][0]).toEqual([{ role: 'user', content: 'hello' }]);
    expect(typeof setMessages.mock.calls[1][0]).toBe('function');
    expect(setMessages.mock.calls[1][0]([{ role: 'user', content: 'hello' }])).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'ok', _thinking: '', thinking: '' }
    ]);
  });

  test('sends pre_send transformed messages when a game card is active', async () => {
    window.electronAPI.getActiveGameCard.mockResolvedValue({
      success: true,
      card: {
        id: 'active',
        rules: [{
          when: { phase: 'pre_send' },
          then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'rules' }]
        }]
      }
    });
    renderInputArea();

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });
      fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'hello' }
    ]);
  });

  test('applies after_response rules before storing assistant message', async () => {
    const setMessages = jest.fn();
    window.electronAPI.getActiveGameCard.mockResolvedValue({
      success: true,
      card: {
        id: 'active',
        rules: [{
          when: { phase: 'after_response' },
          then: [{ type: 'replace', predicate: { index: 'last' }, content: 'cleaned' }]
        }]
      }
    });
    renderInputArea({ setMessages });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });
      fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    });

    await waitFor(() => expect(setMessages).toHaveBeenLastCalledWith([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'cleaned', _thinking: '', thinking: '' }
    ]));
  });
});
