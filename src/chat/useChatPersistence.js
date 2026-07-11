import React from 'react';
import { cloneChatValue, normalizeRetryMessages } from './chatGeneration.js';

function useChatPersistence({ messages, gameState, isLoading, api = window.electronAPI }) {
  const retryBaseRef = React.useRef(null);
  const retryBaseStateRef = React.useRef(null);
  const loadedRef = React.useRef(false);
  const messagesRef = React.useRef(messages);
  const gameStateRef = React.useRef(gameState);
  messagesRef.current = messages;
  gameStateRef.current = gameState;

  const hydrate = React.useCallback((result = {}) => {
    if (Array.isArray(result.retryBaseMessages)) retryBaseRef.current = result.retryBaseMessages;
    if (result.retryBaseState !== undefined) retryBaseStateRef.current = result.retryBaseState;
  }, []);

  const reset = React.useCallback(() => {
    retryBaseRef.current = null;
    retryBaseStateRef.current = null;
  }, []);

  const setRetryBase = React.useCallback((nextMessages, nextState) => {
    retryBaseRef.current = normalizeRetryMessages(nextMessages);
    retryBaseStateRef.current = cloneChatValue(nextState || {});
  }, []);

  const save = React.useCallback(async (nextMessages, nextState) => {
    if (!api?.saveChatHistory) return null;
    return api.saveChatHistory(nextMessages ?? messagesRef.current, {
      gameState: nextState ?? gameStateRef.current,
      retryBaseMessages: retryBaseRef.current,
      retryBaseState: retryBaseStateRef.current
    });
  }, [api]);

  const refreshRetryBase = React.useCallback(async () => {
    const result = await api?.getChatHistory?.();
    if (result?.success) hydrate(result);
    return result?.success ? result : null;
  }, [api, hydrate]);

  React.useEffect(() => {
    if (!loadedRef.current || isLoading) return;
    save();
  }, [messages, gameState, isLoading, save]);

  const markLoaded = React.useCallback(() => { loadedRef.current = true; }, []);

  return React.useMemo(() => ({
    hydrate,
    markLoaded,
    refreshRetryBase,
    reset,
    retryBaseRef,
    retryBaseStateRef,
    save,
    setRetryBase
  }), [hydrate, markLoaded, refreshRetryBase, reset, save, setRetryBase]);
}

export default useChatPersistence;
