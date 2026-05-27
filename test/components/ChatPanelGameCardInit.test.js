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
    ], { retryBaseMessages: null });
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
