import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInputArea from '../../src/renderer/ChatInputArea.jsx';

function renderLoadingInput(stopGeneration = jest.fn()) {
  render(React.createElement(ChatInputArea, {
    isLoading: true,
    isInputHovered: false,
    setIsInputHovered: jest.fn(),
    isInputTriggerHovered: false,
    setIsInputTriggerHovered: jest.fn(),
    onStop: stopGeneration
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
