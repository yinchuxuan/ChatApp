// useRetry - Custom hook for regenerating from the last user message

function getChatGeneration() {
  if (typeof window !== 'undefined' && window.ChatGeneration) return window.ChatGeneration;
  if (typeof require !== 'undefined') return require('./chatGeneration');
  return null;
}

function useRetry(R, messages, setMessages, modelConfig, setIsLoading, tw, retryBaseRef, gameState = {}, setGameState, retryBaseStateRef, onStreamContentStart, generationControl) {
  const handleRetry = R.useCallback(async (editedContent) => {
    if (!modelConfig || !modelConfig.apiUrl || !modelConfig.apiKey) return;
    const helper = getChatGeneration();
    const persisted = await helper.loadRetryBase(retryBaseRef, retryBaseStateRef);
    const persistedMessages = Array.isArray(persisted?.retryBaseMessages) ? persisted.retryBaseMessages : null;
    const persistedState = persisted?.retryBaseState !== undefined ? persisted.retryBaseState : undefined;
    const retryMessages = helper.buildRetryMessages(messages, persistedMessages || retryBaseRef?.current, editedContent);
    if (!retryMessages) return false;
    const stateSnapshot = persistedState !== undefined ? persistedState : retryBaseStateRef?.current;
    const retryState = stateSnapshot !== undefined && stateSnapshot !== null
      ? helper.cloneChatValue(stateSnapshot)
      : {};
    if (retryBaseRef) retryBaseRef.current = helper.normalizeRetryMessages(retryMessages);
    if (retryBaseStateRef) retryBaseStateRef.current = helper.cloneChatValue(retryState);
    if (setGameState) setGameState(retryState);
    return helper.runChatGeneration({
      messages: retryMessages,
      state: retryState,
      modelConfig,
      setMessages,
      setGameState,
      setIsLoading,
      tw,
      onStreamContentStart,
      ...generationControl
    });
  }, [messages, modelConfig, setMessages, setIsLoading, tw, retryBaseRef, gameState, setGameState, retryBaseStateRef, onStreamContentStart, generationControl]);

  return handleRetry;
}

if (typeof window !== 'undefined') { window.useRetry = useRetry; }
module.exports = useRetry;
