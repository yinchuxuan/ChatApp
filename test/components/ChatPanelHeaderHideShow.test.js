/**
 * Tests for ChatPanel Header Hide on Default, Show on Hover
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import ChatPanel from '../../src/ChatPanel.jsx';

const electronAPI = global.window.electronAPI;

describe('ChatPanel Header Hide/Show on Hover', () => {
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

  test('header should be hidden by default (no chat-header-visible class)', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    expect(chatHeader).toBeTruthy();
    expect(chatHeader.classList.contains('chat-header-visible')).toBe(false);
  });

  test('header should show on hover (add chat-header-visible class)', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.mouseEnter(chatHeader);

    expect(chatHeader.classList.contains('chat-header-visible')).toBe(true);
  });

  test('header should hide on mouse leave', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.mouseEnter(chatHeader);
    expect(chatHeader.classList.contains('chat-header-visible')).toBe(true);

    fireEvent.mouseLeave(chatHeader);
    expect(chatHeader.classList.contains('chat-header-visible')).toBe(false);
  });

  test('hover trigger zone should show header on mouse enter', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const triggerZone = document.querySelector('.chat-header-hover-trigger');
    expect(triggerZone).toBeTruthy();

    fireEvent.mouseEnter(triggerZone);

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    expect(chatHeader.classList.contains('chat-header-visible')).toBe(true);
  });

  test('clicking hidden header should still toggle to API view', async () => {
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    expect(screen.getByText('API请求')).toBeInTheDocument();
  });
});
