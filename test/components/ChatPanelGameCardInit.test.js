import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import ChatPanel from '../../src/ChatPanel.jsx';

describe('ChatPanel game card init', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.getModelConfig.mockResolvedValue({ success: true, config: {} });
    window.electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: [] });
    window.electronAPI.getActiveGameCard.mockResolvedValue({
      success: true,
      card: {
        version: '1',
        id: 'init-card',
        name: 'Init Card',
        rules: [{
          when: { phase: 'init', length: 0 },
          then: [{
            type: 'insert',
            role: 'system',
            content: 'intro',
            _meta: { source: 'game_card_init', visibility: 'user_visible' }
          }]
        }]
      }
    });
  });

  test('runs init rules after loading an empty history and saves the result', async () => {
    render(React.createElement(ChatPanel));

    await waitFor(() => expect(screen.getByText('intro')).toBeInTheDocument());
    expect(window.electronAPI.saveChatHistory).toHaveBeenCalledWith([
      { role: 'system', content: 'intro', _meta: { source: 'game_card_init', visibility: 'user_visible' } }
    ], { gameState: {}, retryBaseMessages: null, retryBaseState: null });
  });

  test('loads saved gameState and saves init state changes', async () => {
    const originalPrepareInit = window.prepareInitMessages;
    window.electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [],
      gameState: { score: 1 }
    });
    window.prepareInitMessages = jest.fn(async ({ messages, state }) => ({
      messages: [...messages, { role: 'system', content: `score:${state.score}`, _meta: { visibility: 'user_visible' } }],
      state: { score: 2 },
      changed: true
    }));

    render(React.createElement(ChatPanel));

    await waitFor(() => expect(screen.getByText('score:1')).toBeInTheDocument());
    expect(window.prepareInitMessages).toHaveBeenCalledWith({ messages: [], state: { score: 1 } });
    expect(window.electronAPI.saveChatHistory).toHaveBeenCalledWith([
      { role: 'system', content: 'score:1', _meta: { visibility: 'user_visible' } }
    ], { gameState: { score: 2 }, retryBaseMessages: null, retryBaseState: null });
    window.prepareInitMessages = originalPrepareInit;
  });

  test('reruns history loading and init after the active game card changes', async () => {
    window.electronAPI.getActiveGameCard.mockResolvedValue({ success: true, card: null });
    render(React.createElement(ChatPanel));

    await waitFor(() => expect(window.electronAPI.getChatHistory).toHaveBeenCalled());
    window.electronAPI.getActiveGameCard.mockResolvedValue({
      success: true,
      card: {
        version: '1',
        id: 'init-card',
        name: 'Init Card',
        rules: [{
          when: { phase: 'init', length: 0 },
          then: [{ type: 'insert', role: 'system', content: 'intro', _meta: { visibility: 'user_visible' } }]
        }]
      }
    });
    await act(async () => {
      window.dispatchEvent(new CustomEvent('game-card-changed'));
    });

    await waitFor(() => expect(screen.getByText('intro')).toBeInTheDocument());
  });
});
