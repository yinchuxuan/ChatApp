import React from 'react';
import { render, waitFor, screen, act, fireEvent } from '@testing-library/react';
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

  test('shows active game card load errors in the chat panel', async () => {
    const originalPrepareInit = window.prepareInitMessages;
    window.prepareInitMessages = jest.fn(async ({ messages, state }) => ({
      messages,
      state,
      changed: false,
      error: 'state schema 文件无法读取或不是合法 JSON',
      stage: 'load_state_schema',
      file: 'state/schema.json',
      details: [{ file: 'state/schema.json', message: 'Unexpected token } in JSON' }]
    }));

    render(React.createElement(ChatPanel));

    await waitFor(() => expect(screen.getByText('当前游戏卡无法运行')).toBeInTheDocument());
    expect(screen.getByText('state schema 文件无法读取或不是合法 JSON')).toBeInTheDocument();
    expect(screen.getByText('阶段: 读取状态 schema')).toBeInTheDocument();
    expect(screen.getAllByText(/state\/schema\.json/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Unexpected token/)).toBeInTheDocument();
    window.prepareInitMessages = originalPrepareInit;
  });

  test('renders import errors outside the auto-hidden header', async () => {
    window.electronAPI.importGameCardFromDirectory.mockResolvedValue({
      success: false,
      error: '游戏卡主文件 schema 校验失败',
      stage: 'validate_card',
      file: 'card.json',
      details: [{ file: 'card.json', message: 'rules[0].then: must be a non-empty array' }]
    });

    render(React.createElement(ChatPanel));
    await screen.findByText('Init Card');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '导入游戏卡文件夹' }));
    });

    const panel = document.querySelector('.chat-main > .game-card-error-panel.import');
    expect(panel).not.toBeNull();
    expect(panel).toHaveTextContent('导入游戏卡失败');
    expect(panel).toHaveTextContent('rules[0].then: must be a non-empty array');
    fireEvent.click(screen.getByRole('button', { name: '关闭导入错误' }));
    expect(document.querySelector('.chat-main > .game-card-error-panel.import')).toBeNull();
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
