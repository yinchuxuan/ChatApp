import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import ChatInputArea from '../../src/renderer/ChatInputArea.jsx';
import { dispatchChatInputCommand } from '../../src/renderer/chat/chatInputCommands.js';

function renderInputArea(props = {}) {
  return render(React.createElement(ChatInputArea, {
    isLoading: false,
    isInputHovered: false,
    setIsInputHovered: jest.fn(),
    isInputTriggerHovered: false,
    setIsInputTriggerHovered: jest.fn(),
    ...props
  }));
}

function dispatchInputAction(detail) {
  dispatchChatInputCommand(detail);
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
    const onSend = jest.fn(async () => true);
    renderInputArea({ onSend });

    await act(async () => {
      dispatchInputAction({ type: 'chat.send', content: '继续' });
    });

    await waitFor(() => expect(onSend).toHaveBeenCalledWith('继续'));
  });
});
