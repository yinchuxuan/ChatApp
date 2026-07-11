import React from 'react';
import generationServices from './generationServices.js';
import { normalizeGameCardError } from '../components/GameCardErrorPanel.jsx';

function useChatSession({
  setMessages,
  setGameState,
  setRuntimeError,
  isLoading,
  persistence,
  typewriter,
  onResetView,
  api = window.electronAPI
}) {
  const load = React.useCallback(async () => {
    const result = await api?.getChatHistory?.();
    if (result?.success) {
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
    }
    persistence.markLoaded();
    return result;
  }, [api, persistence, setGameState, setMessages, setRuntimeError]);

  React.useEffect(() => { load(); }, [load]);

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
    const result = await api?.setActiveChatSession?.(id);
    if (result?.success) await reload();
    return result;
  }, [api, reload, saveCurrent]);

  return { load, reload, saveCurrent, switchSession };
}

export default useChatSession;
