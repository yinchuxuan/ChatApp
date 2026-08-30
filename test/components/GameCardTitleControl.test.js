import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GameCardTitleControl from '../../src/renderer/components/GameCardTitleControl.jsx';
import { GameCardRuntimeProvider } from '../../src/renderer/chat/GameCardRuntimeProvider.jsx';

describe('GameCardTitleControl', () => {
  test('routes import through the game card switch callback', async () => {
    const card = { id: 'imported', name: 'Imported Card', version: '1', rules: [] };
    const onImportCard = jest.fn(async () => card);
    const platform = { repository: { getActiveCard: jest.fn(async () => null) } };
    const cardRepository = { list: jest.fn(async () => []) };

    render(
      <GameCardRuntimeProvider platform={platform}>
        <GameCardTitleControl
          cardRepository={cardRepository}
          onActivateCard={jest.fn()}
          onImportCard={onImportCard}
        />
      </GameCardRuntimeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '切换游戏卡' }));
    fireEvent.click(await screen.findByRole('button', { name: '导入游戏卡文件' }));

    await waitFor(() => expect(onImportCard).toHaveBeenCalled());
  });
});
