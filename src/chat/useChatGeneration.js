import React from 'react';
import * as chatGeneration from './chatGeneration.js';
import useGenerationAbort from './useGenerationAbort.js';
import { createChatMessage } from './messageIds.js';

function useChatGeneration({
  messages,
  setMessages,
  gameState,
  setGameState,
  modelConfig,
  typewriter,
  persistence,
  isLoading,
  setIsLoading,
  setRuntimeError,
  setShowStreamThinking,
  onAudioSubmit,
  onStreamContentStart
}) {
  const generationControl = useGenerationAbort();

  const run = React.useCallback((nextMessages, nextState, appendAssistantWithUpdater = false) => (
    chatGeneration.runChatGeneration({
      messages: nextMessages,
      state: nextState,
      modelConfig,
      setMessages,
      setGameState,
      setIsLoading,
      tw: typewriter,
      setShowStreamThinking,
      onStreamContentStart,
      onGameCardError: setRuntimeError,
      ...generationControl,
      appendAssistantWithUpdater
    })
  ), [generationControl, modelConfig, onStreamContentStart, setGameState, setMessages,
    setRuntimeError, setShowStreamThinking, typewriter]);

  const send = React.useCallback(async (rawValue) => {
    const value = String(rawValue || '');
    if (!value.trim() || isLoading) return false;
    if (!modelConfig?.apiUrl || !modelConfig?.apiKey) {
      setMessages(prev => [
        ...prev,
        createChatMessage({ role: 'user', content: value }),
        createChatMessage({ role: 'assistant', content: '请先在右侧设置面板配置模型 API', isError: true })
      ]);
      return true;
    }
    onAudioSubmit?.();
    const nextMessages = [...messages, createChatMessage({ role: 'user', content: value })];
    persistence.setRetryBase(nextMessages, gameState);
    await run(nextMessages, gameState, true);
    return true;
  }, [gameState, isLoading, messages, modelConfig, onAudioSubmit, persistence, run, setMessages]);

  const retry = React.useCallback(async (editedContent) => {
    if (!modelConfig?.apiUrl || !modelConfig?.apiKey || isLoading) return false;
    const persisted = await persistence.refreshRetryBase();
    const persistedMessages = Array.isArray(persisted?.retryBaseMessages)
      ? persisted.retryBaseMessages
      : persistence.retryBaseRef.current;
    const retryMessages = chatGeneration.buildRetryMessages(messages, persistedMessages, editedContent);
    if (!retryMessages) return false;
    const persistedState = persisted?.retryBaseState !== undefined
      ? persisted.retryBaseState
      : persistence.retryBaseStateRef.current;
    const retryState = persistedState !== undefined && persistedState !== null
      ? chatGeneration.cloneChatValue(persistedState)
      : {};
    persistence.setRetryBase(retryMessages, retryState);
    setGameState(retryState);
    return run(retryMessages, retryState);
  }, [isLoading, messages, modelConfig, persistence, run, setGameState]);

  return React.useMemo(() => ({
    isLoading,
    retry,
    send,
    stop: generationControl.stopGeneration
  }), [generationControl.stopGeneration, isLoading, retry, send]);
}

export default useChatGeneration;
