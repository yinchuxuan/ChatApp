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
  onSessionLoaded,
  repository = rendererServices.sessions
}) {
  const [revision, setRevision] = React.useState(0);
  const loadCurrent = React.useCallback(async () => {
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
      onSessionLoaded?.({ card: init.card || null, state: nextState });
      if (init.changed) await persistence.save(nextMessages, nextState);
      return result;
    } catch (error) {
      setRuntimeError(normalizeGameCardError(error));
      return null;
    } finally {
      persistence.markLoaded();
    }
  }, [onSessionLoaded, persistence, repository, setGameState, setMessages, setRuntimeError]);

  const load = React.useCallback(() => {
    setRevision(value => value + 1);
    return loadCurrent();
  }, [loadCurrent]);

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
    setRevision(value => value + 1);
    await saveCurrent();
    const result = await repository.setActive(id);
    persistence.reset();
    typewriter.clearStreaming();
    onResetView?.();
    await loadCurrent();
    return { success: true, ...result };
  }, [loadCurrent, onResetView, persistence, repository, saveCurrent, typewriter]);

  return { load, reload, revision, saveCurrent, switchSession };
}

export default useChatSession;
