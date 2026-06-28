import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import ChatInputArea from '../../src/ChatInputArea.jsx';

function renderInputArea(props = {}) {
  const tw = {
    startStreaming: jest.fn(),
    pushContent: jest.fn(() => true),
    finishStreaming: jest.fn(),
    getAccumulatedContent: jest.fn(() => 'ok'),
    getThinkingContent: jest.fn(() => ''),
    clearStreaming: jest.fn(),
    reset: jest.fn()
  };
  return render(React.createElement(ChatInputArea, {
    messages: [],
    setMessages: jest.fn(),
    gameState: {},
    setGameState: jest.fn(),
    modelConfig: { apiUrl: 'https://api.example.com/v1', apiKey: 'key', modelName: 'gpt-4' },
    isLoading: false,
    setIsLoading: jest.fn(),
    tw,
    setShowStreamThinking: jest.fn(),
    isInputHovered: false,
    setIsInputHovered: jest.fn(),
    isInputTriggerHovered: false,
    setIsInputTriggerHovered: jest.fn(),
    ...props
  }));
}

function dispatchInputAction(detail) {
  window.dispatchEvent(new CustomEvent('game-card-chat-input-action', { detail }));
}

describe('ChatInputArea ui runtime events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue(global.createStreamingMock('ok'));
  });

  test('sets appends clears and focuses input from game card ui events', async () => {
    renderInputArea();
    const input = screen.getByPlaceholderText('输入您的回答...');

    act(() => dispatchInputAction({ type: 'chat.input.set', value: 'A. 去第三音乐室', focus: true }));
    await waitFor(() => expect(input).toHaveValue('A. 去第三音乐室'));
    await waitFor(() => expect(input).toHaveFocus());

    act(() => dispatchInputAction({ type: 'chat.input.append', value: '。' }));
    expect(input).toHaveValue('A. 去第三音乐室。');

    act(() => dispatchInputAction({ type: 'chat.input.clear' }));
    expect(input).toHaveValue('');
  });

  test('sends explicit content through normal chat pipeline', async () => {
    renderInputArea();

    await act(async () => {
      dispatchInputAction({ type: 'chat.send', content: '继续' });
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.messages).toEqual([{ role: 'user', content: '继续' }]);
  });
});
