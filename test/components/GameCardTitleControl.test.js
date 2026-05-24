import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

import GameCardTitleControl from '../../src/components/GameCardTitleControl.jsx';

const electronAPI = global.window.electronAPI;

describe('GameCardTitleControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getActiveGameCard.mockResolvedValue({ success: true, card: null });
    electronAPI.importGameCardFromFile.mockResolvedValue({ success: false, canceled: true, card: null });
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
    electronAPI.importGameCardFromFile.mockResolvedValue({
      success: true,
      card: { id: 'new_quest', name: 'New Quest', rules: [] }
    });

    render(
      <div onClick={headerClick}>
        <GameCardTitleControl />
      </div>
    );

    await screen.findByText('未加载游戏卡');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '导入游戏卡 JSON' }));
    });

    expect(electronAPI.importGameCardFromFile).toHaveBeenCalled();
    expect(headerClick).not.toHaveBeenCalled();
    expect(screen.getByText('New Quest')).toBeInTheDocument();
  });
});
