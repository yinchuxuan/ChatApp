import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatInputArea from '../../src/ChatInputArea.jsx';

function renderInputArea(props = {}) {
  const tw = {
    startStreaming: jest.fn(),
    pushContent: jest.fn(() => 'ok'),
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
}

describe('ChatInputArea retry base', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue(global.createStreamingMock('ok'));
  });

  test('saves retry base without transient game card context', async () => {
    const retryBaseRef = { current: null };
    renderInputArea({
      retryBaseRef,
      messages: [
        { role: 'system', content: 'old state 08:00', ttl: 1, _meta: { source: 'wa2_state_context' } },
        { role: 'user', content: '旧选择\n\n---\n<wa2_turn_context>\n旧上下文\n</wa2_turn_context>' },
        { role: 'assistant', content: 'old answer' }
      ]
    });

    fireEvent.change(screen.getByPlaceholderText('输入您的回答...'), { target: { value: '新选择' } });
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }));

    await waitFor(() => expect(retryBaseRef.current).toBeTruthy());
    expect(retryBaseRef.current).toEqual([
      { role: 'user', content: '旧选择' },
      { role: 'assistant', content: 'old answer' },
      { role: 'user', content: '新选择' }
    ]);
  });
});
