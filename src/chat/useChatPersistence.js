import React from 'react';
import { cloneChatValue, normalizeRetryMessages } from './chatGeneration.js';
import { rendererServices } from '../platform/index.js';

function useChatPersistence({ messages, gameState, isLoading, repository = rendererServices.sessions }) {
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
    return repository.saveHistory(nextMessages ?? messagesRef.current, {
      gameState: nextState ?? gameStateRef.current,
      retryBaseMessages: retryBaseRef.current,
      retryBaseState: retryBaseStateRef.current
    });
  }, [repository]);

  const refreshRetryBase = React.useCallback(async () => {
    try {
      const result = await repository.loadHistory();
      hydrate(result);
      return result;
    } catch {
      return null;
    }
  }, [hydrate, repository]);

  React.useEffect(() => {
    if (!loadedRef.current || isLoading) return;
    void save().catch(() => {});
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
