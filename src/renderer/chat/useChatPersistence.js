import React from 'react';
import { cloneChatValue, normalizeRetryMessages } from './chatGeneration.js';
import { rendererServices } from '../platform/index.js';

function normalizedViewState(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
}

function useChatPersistence({ messages, gameState, isLoading, repository = rendererServices.sessions }) {
  const retryBaseRef = React.useRef(null);
  const retryBaseStateRef = React.useRef(null);
  const viewStateRef = React.useRef({});
  const readingRestoreTokenRef = React.useRef(0);
  const loadedRef = React.useRef(false);
  const [viewState, setViewState] = React.useState({});
  const messagesRef = React.useRef(messages);
  const gameStateRef = React.useRef(gameState);
  messagesRef.current = messages;
  gameStateRef.current = gameState;

  const hydrate = React.useCallback((result = {}) => {
    if (Array.isArray(result.retryBaseMessages)) retryBaseRef.current = result.retryBaseMessages;
    if (result.retryBaseState !== undefined) retryBaseStateRef.current = result.retryBaseState;
    const nextViewState = normalizedViewState(result.viewState);
    viewStateRef.current = nextViewState;
    readingRestoreTokenRef.current += 1;
    setViewState(nextViewState);
  }, []);

  const reset = React.useCallback(() => {
    loadedRef.current = false;
    retryBaseRef.current = null;
    retryBaseStateRef.current = null;
    viewStateRef.current = {};
    readingRestoreTokenRef.current += 1;
    setViewState({});
  }, []);

  const setRetryBase = React.useCallback((nextMessages, nextState) => {
    retryBaseRef.current = normalizeRetryMessages(nextMessages);
    retryBaseStateRef.current = cloneChatValue(nextState || {});
  }, []);

  const save = React.useCallback(async (nextMessages, nextState) => {
    return repository.saveHistory(nextMessages ?? messagesRef.current, {
      gameState: nextState ?? gameStateRef.current,
      retryBaseMessages: retryBaseRef.current,
      retryBaseState: retryBaseStateRef.current,
      viewState: viewStateRef.current
    });
  }, [repository]);

  const setReadingPosition = React.useCallback((position) => {
    const messageId = String(position?.messageId || '');
    const segmentIndex = Number.isInteger(position?.segmentIndex) ? position.segmentIndex : 0;
    if (!messageId || segmentIndex < 0) return;
    const current = viewStateRef.current;
    if (current.reading?.messageId === messageId
      && current.reading?.segmentIndex === segmentIndex) return;
    const next = { ...current, reading: { messageId, segmentIndex } };
    viewStateRef.current = next;
    setViewState(next);
  }, []);

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
  }, [messages, gameState, isLoading, save, viewState]);

  const markLoaded = React.useCallback(() => { loadedRef.current = true; }, []);

  return React.useMemo(() => ({
    hydrate,
    markLoaded,
    refreshRetryBase,
    reset,
    retryBaseRef,
    retryBaseStateRef,
    get readingPosition() { return viewStateRef.current.reading || null; },
    get readingRestoreToken() { return readingRestoreTokenRef.current; },
    save,
    setReadingPosition,
    setRetryBase
  }), [hydrate, markLoaded, refreshRetryBase, reset, save, setReadingPosition, setRetryBase]);
}

export default useChatPersistence;
