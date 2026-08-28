import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import GameCardSwitcher from '../../src/renderer/components/GameCardSwitcher.jsx';

describe('GameCardSwitcher', () => {
  test('lists normal chat and imported game cards', async () => {
    const activeCard = { id: 'quest', name: 'Quest Card' };
    const otherCard = { id: 'other', name: 'Other Card' };
    const onActivate = jest.fn(async () => null);
    const repository = { list: jest.fn(async () => [activeCard, otherCard]) };

    render(<GameCardSwitcher activeCard={activeCard} repository={repository}
      onActivate={onActivate} onImport={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '切换游戏卡' }));

    expect(await screen.findByText('Other Card')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '普通聊天' }));
    });

    expect(onActivate).toHaveBeenCalledWith(null);
  });
});
