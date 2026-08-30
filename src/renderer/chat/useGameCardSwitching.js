import React from 'react';
import { rendererServices } from '../platform/index.js';

function useGameCardSwitching({
  isLoading,
  presentation,
  runtime,
  session,
  repository = rendererServices.cards
}) {
  const finishSwitch = React.useCallback(async (card) => {
    runtime.setRuntimeError(null);
    runtime.changeActiveCard(card || null);
    presentation.stopBgm();
    presentation.updateAll(null, {});
    await session.reload();
    return card || null;
  }, [presentation, runtime, session]);

  const activate = React.useCallback(async (card) => {
    if (isLoading) return null;
    await session.saveCurrent();
    await repository.setActive(card?.id || null);
    return finishSwitch(card);
  }, [finishSwitch, isLoading, repository, session]);

  const importCard = React.useCallback(async () => {
    if (isLoading) return null;
    await session.saveCurrent();
    const card = await repository.importFile();
    if (!card) return null;
    return finishSwitch(card);
  }, [finishSwitch, isLoading, repository, session]);

  return { activate, importCard };
}

export default useGameCardSwitching;
