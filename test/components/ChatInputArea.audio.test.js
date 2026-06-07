import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  render(React.createElement(ChatInputArea, {
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
  return { tw };
}

describe('ChatInputArea audio timing hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue(global.createStreamingMock('ok'));
  });

  test('does not stop audio while the user is only typing', () => {
    const onAudioSubmit = jest.fn();
    renderInputArea({ onAudioSubmit });

    fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });

    expect(onAudioSubmit).not.toHaveBeenCalled();
  });

  test('stops audio after the user submits a message', async () => {
    const onAudioSubmit = jest.fn();
    renderInputArea({ onAudioSubmit });

    fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(onAudioSubmit).toHaveBeenCalledTimes(1));
  });

  test('resumes audio when response body starts streaming', async () => {
    const onStreamContentStart = jest.fn();
    const tw = renderInputArea({ onStreamContentStart }).tw;
    tw.pushContent.mockReturnValueOnce('ok');

    fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(onStreamContentStart).toHaveBeenCalledTimes(1));
  });

  test('does not resume audio for thinking-only tokens', async () => {
    const onStreamContentStart = jest.fn();
    const tw = renderInputArea({ onStreamContentStart }).tw;
    tw.pushContent.mockReturnValue('');

    fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(tw.pushContent).toHaveBeenCalled());
    expect(onStreamContentStart).not.toHaveBeenCalled();
  });
});
