import React from 'react';
import generationServices from './generationServices.js';
import { normalizeGameCardError } from '../gameCard/runtimeError.js';
import { rendererServices } from '../platform/index.js';

function useChatSession({
  setMessages,
  setGameState,
  setRuntimeError,
  isLoading,
  persistence,
  typewriter,
  onResetView,
  repository = rendererServices.sessions
}) {
  const load = React.useCallback(async () => {
    try {
      const result = await repository.loadHistory();
      persistence.hydrate(result);
      const loadedMessages = result.messages || [];
      const loadedState = result.gameState || {};
      const init = await generationServices.prepareInitMessages({ messages: loadedMessages, state: loadedState });
      const nextMessages = init.changed ? init.messages : loadedMessages;
      const nextState = init.state || loadedState;
      setRuntimeError(init.error ? normalizeGameCardError(init) : null);
      setMessages(nextMessages);
      setGameState(nextState);
      if (init.changed) await persistence.save(nextMessages, nextState);
      return result;
    } catch (error) {
      setRuntimeError(normalizeGameCardError(error));
      return null;
    } finally {
      persistence.markLoaded();
    }
  }, [persistence, repository, setGameState, setMessages, setRuntimeError]);

  React.useEffect(() => { void load(); }, [load]);

  const saveCurrent = React.useCallback(async () => {
    if (isLoading) return null;
    return persistence.save();
  }, [isLoading, persistence]);

  const reload = React.useCallback(async () => {
    persistence.reset();
    typewriter.clearStreaming();
    onResetView?.();
    return load();
  }, [load, onResetView, persistence, typewriter]);

  const switchSession = React.useCallback(async (id) => {
    await saveCurrent();
    const result = await repository.setActive(id);
    await reload();
    return { success: true, ...result };
  }, [reload, repository, saveCurrent]);

  return { load, reload, saveCurrent, switchSession };
}

export default useChatSession;
