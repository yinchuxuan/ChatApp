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

  test('passes generation parameters from model config', async () => {
    window.electronAPI.getActiveGameCard.mockResolvedValue({ success: true, card: null });
    renderInputArea({
      modelConfig: {
        apiUrl: 'https://api.example.com/v1',
        apiKey: 'key',
        modelName: 'gpt-4',
        maxTokens: '2048',
        temperature: '0.8',
        topP: '0.9',
        frequencyPenalty: '0.2',
        presencePenalty: '0.4'
      }
    });

    fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(2048);
    expect(body.temperature).toBe(0.8);
    expect(body.top_p).toBe(0.9);
    expect(body.frequency_penalty).toBe(0.2);
    expect(body.presence_penalty).toBe(0.4);
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
    const setMessages = jest.fn();
    window.electronAPI.getActiveGameCard.mockResolvedValue({
      success: true,
      card: {
        version: '1',
        id: 'active',
        name: 'Active Card',
        rules: [{
          when: { phase: 'pre_send' },
          then: [{ type: 'insert', predicate: { index: 0 }, anchor: 'before', role: 'system', content: 'rules' }]
        }]
      }
    });
    renderInputArea({ setMessages });

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
    expect(setMessages).toHaveBeenCalledWith([
      { role: 'system', content: 'rules' },
      { role: 'user', content: 'hello' }
    ]);
  });

  test('applies after_response rules before storing assistant message', async () => {
    const setMessages = jest.fn();
    window.electronAPI.getActiveGameCard.mockResolvedValue({
      success: true,
      card: {
        version: '1',
        id: 'active',
        name: 'Active Card',
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

  test('passes and updates gameState through send pipeline', async () => {
    const originalPreSend = window.preparePreSendMessages;
    const originalAfter = window.prepareAfterResponseMessages;
    const setGameState = jest.fn();
    window.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
      messages,
      state: { score: state.score + 1 },
      applied: false,
      card: { id: 'state-card' }
    }));
    window.prepareAfterResponseMessages = jest.fn(async ({ messages, state }) => ({
      messages,
      state: { score: state.score + 10 },
      applied: false
    }));

    renderInputArea({ gameState: { score: 1 }, setGameState });

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });
      fireEvent.click(screen.getByRole('button', { name: '发送消息' }));
    });

    await waitFor(() => expect(window.prepareAfterResponseMessages).toHaveBeenCalled());
    expect(window.preparePreSendMessages.mock.calls[0][0].state).toEqual({ score: 1 });
    expect(window.prepareAfterResponseMessages.mock.calls[0][0].state).toEqual({ score: 2 });
    expect(setGameState).toHaveBeenLastCalledWith({ score: 12 });
    window.preparePreSendMessages = originalPreSend;
    window.prepareAfterResponseMessages = originalAfter;
  });
});
