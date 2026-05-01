/**
 * Tests for ChatPanel Input Area Hide on Default, Show on Hover
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;

describe('ChatPanel Input Area Hide/Show on Hover', () => {
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

  test('input area should be hidden by default (no chat-input-area-visible class)', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const inputArea = document.querySelector('.chat-input-area');
    expect(inputArea).toBeTruthy();
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(false);
  });

  test('input area should show when bottom hover trigger is entered', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const triggerZone = document.querySelector('.chat-input-hover-trigger');
    expect(triggerZone).toBeTruthy();

    fireEvent.mouseEnter(triggerZone);

    const inputArea = document.querySelector('.chat-input-area');
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(true);
  });

  test('input area should hide when mouse leaves bottom hover trigger', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const triggerZone = document.querySelector('.chat-input-hover-trigger');
    fireEvent.mouseEnter(triggerZone);

    const inputArea = document.querySelector('.chat-input-area');
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(true);

    fireEvent.mouseLeave(triggerZone);

    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(false);
  });

  test('input area should show on hover and hide on mouse leave', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const inputArea = document.querySelector('.chat-input-area');
    fireEvent.mouseEnter(inputArea);
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(true);

    fireEvent.mouseLeave(inputArea);
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(false);
  });

  test('input area should stay visible when textarea is focused', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const textarea = document.querySelector('.chat-input-textarea');
    expect(textarea).toBeTruthy();

    fireEvent.focus(textarea);

    const inputArea = document.querySelector('.chat-input-area');
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(true);
  });

  test('input area should stay visible when textarea has content', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const textarea = document.querySelector('.chat-input-textarea');
    fireEvent.change(textarea, { target: { value: 'Hello' } });

    const inputArea = document.querySelector('.chat-input-area');
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(true);
  });

  test('input area should not have visible class after textarea loses focus with empty content', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const textarea = document.querySelector('.chat-input-textarea');
    fireEvent.focus(textarea);

    const inputArea = document.querySelector('.chat-input-area');
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(true);

    fireEvent.blur(textarea);

    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(false);
  });

  test('input area should stay visible when textarea has content after losing focus', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const textarea = document.querySelector('.chat-input-textarea');
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.focus(textarea);
    fireEvent.blur(textarea);

    const inputArea = document.querySelector('.chat-input-area');
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(true);
  });

  test('both hover triggers should be present in the DOM', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const topTrigger = document.querySelector('.chat-header-hover-trigger');
    const bottomTrigger = document.querySelector('.chat-input-hover-trigger');
    expect(topTrigger).toBeTruthy();
    expect(bottomTrigger).toBeTruthy();
  });

  test('input area hover should not affect header hover state', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const bottomTrigger = document.querySelector('.chat-input-hover-trigger');
    fireEvent.mouseEnter(bottomTrigger);

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    expect(chatHeader.classList.contains('chat-header-visible')).toBe(false);

    const inputArea = document.querySelector('.chat-input-area');
    expect(inputArea.classList.contains('chat-input-area-visible')).toBe(true);
  });
});
