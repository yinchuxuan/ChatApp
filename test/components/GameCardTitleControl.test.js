import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GameCardTitleControl from '../../src/renderer/components/GameCardTitleControl.jsx';
import { GameCardRuntimeProvider } from '../../src/renderer/chat/GameCardRuntimeProvider.jsx';

describe('GameCardTitleControl', () => {
  test('uses the CardRepository game card result directly after import', async () => {
    const card = { id: 'imported', name: 'Imported Card', version: '1', rules: [] };
    const onActiveCardChanged = jest.fn();
    const platform = { repository: { getActiveCard: jest.fn(async () => null) } };
    const cardRepository = { importDirectory: jest.fn(async () => card) };

    render(
      <GameCardRuntimeProvider platform={platform}>
        <GameCardTitleControl
          cardRepository={cardRepository}
          onActiveCardChanged={onActiveCardChanged}
        />
      </GameCardRuntimeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '导入游戏卡文件夹' }));

    await screen.findByText('Imported Card');
    await waitFor(() => expect(onActiveCardChanged).toHaveBeenCalledWith(card));
  });
});
