import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

import '../../src/components/ChatSessionManager.jsx';
import GameCardTitleControl from '../../src/components/GameCardTitleControl.jsx';

const electronAPI = global.window.electronAPI;

describe('GameCardTitleControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getActiveGameCard.mockResolvedValue({ success: true, card: null });
    electronAPI.importGameCardFromDirectory.mockResolvedValue({ success: false, canceled: true, card: null });
    electronAPI.listChatSessions.mockResolvedValue({
      success: true,
      activeId: 'default',
      sessions: [{ id: 'default', title: '默认会话', preview: '开场', messageCount: 1 }]
    });
    electronAPI.createChatSession.mockResolvedValue({ success: true, id: 'session-1' });
    electronAPI.setActiveChatSession.mockResolvedValue({ success: true, id: 'session-1' });
  });

  test('shows current active game card', async () => {
    electronAPI.getActiveGameCard.mockResolvedValue({
      success: true,
      card: { id: 'quest', name: 'Quest Card', rules: [] }
    });

    render(<GameCardTitleControl />);

    await screen.findByText('Quest Card');
  });

  test('shows empty state when no game card is loaded', async () => {
    render(<GameCardTitleControl />);

    await screen.findByText('未加载游戏卡');
  });

  test('imports a game card and stops header click propagation', async () => {
    const headerClick = jest.fn();
    const cardChanged = jest.fn();
    electronAPI.importGameCardFromDirectory.mockResolvedValue({
      success: true,
      card: { id: 'new_quest', name: 'New Quest', rules: [] }
    });
    window.addEventListener('game-card-changed', cardChanged);

    render(
      <div onClick={headerClick}>
        <GameCardTitleControl />
      </div>
    );

    await screen.findByText('未加载游戏卡');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '导入游戏卡文件夹' }));
    });

    expect(electronAPI.importGameCardFromDirectory).toHaveBeenCalled();
    expect(headerClick).not.toHaveBeenCalled();
    expect(cardChanged).toHaveBeenCalledWith(expect.objectContaining({
      detail: { id: 'new_quest', name: 'New Quest', rules: [] }
    }));
    expect(screen.getByText('New Quest')).toBeInTheDocument();
    window.removeEventListener('game-card-changed', cardChanged);
  });

  test('opens session manager without showing session name in title', async () => {
    render(<GameCardTitleControl />);

    await screen.findByText('未加载游戏卡');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '管理聊天会话' }));
    });

    expect(screen.getByText('会话')).toBeInTheDocument();
    expect(screen.getByText('默认会话')).toBeInTheDocument();
    expect(screen.getByText('未加载游戏卡')).toBeInTheDocument();
  });

  test('creates and switches sessions through callbacks', async () => {
    const before = jest.fn();
    const changed = jest.fn();
    electronAPI.listChatSessions
      .mockResolvedValueOnce({ success: true, activeId: 'default', sessions: [{ id: 'default', title: '默认会话' }] })
      .mockResolvedValue({ success: true, activeId: 'session-1', sessions: [{ id: 'session-1', title: '新会话' }] });

    render(<GameCardTitleControl onBeforeSessionChange={before} onSessionChanged={changed} />);
    await screen.findByText('未加载游戏卡');
    fireEvent.click(screen.getByRole('button', { name: '管理聊天会话' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '新建会话' }));
    });

    await waitFor(() => expect(electronAPI.createChatSession).toHaveBeenCalledWith('新会话'));
    expect(before).toHaveBeenCalled();
    expect(changed).toHaveBeenCalledWith('session-1');
  });
});
