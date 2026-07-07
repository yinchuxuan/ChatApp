import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInputArea from '../../src/ChatInputArea.jsx';

function renderLoadingInput(stopGeneration = jest.fn()) {
  const tw = {
    startStreaming: jest.fn(),
    pushContent: jest.fn(),
    finishStreaming: jest.fn(),
    getAccumulatedContent: jest.fn(() => ''),
    getThinkingContent: jest.fn(() => ''),
    clearStreaming: jest.fn(),
    reset: jest.fn()
  };
  render(React.createElement(ChatInputArea, {
    messages: [],
    setMessages: jest.fn(),
    modelConfig: { apiUrl: 'https://api.example.com/v1', apiKey: 'key', modelName: 'gpt-4' },
    isLoading: true,
    setIsLoading: jest.fn(),
    tw,
    setShowStreamThinking: jest.fn(),
    isInputHovered: false,
    setIsInputHovered: jest.fn(),
    isInputTriggerHovered: false,
    setIsInputTriggerHovered: jest.fn(),
    generationControl: { stopGeneration }
  }));
  return { stopGeneration };
}

describe('ChatInputArea stop generation button', () => {
  test('reuses the send button as an enabled stop button while loading', () => {
    const { stopGeneration } = renderLoadingInput();
    const button = screen.getByRole('button', { name: '停止生成' });
    expect(button).toBeEnabled();
    expect(button.querySelector('.material-icons')).toHaveTextContent('stop');

    fireEvent.click(button);

    expect(stopGeneration).toHaveBeenCalledTimes(1);
  });
});
