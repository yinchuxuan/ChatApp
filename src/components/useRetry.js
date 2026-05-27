// useRetry - Custom hook for regenerating from the last user message

function cloneMessages(messages) {
  if (typeof structuredClone === 'function') return structuredClone(messages);
  return JSON.parse(JSON.stringify(messages));
}

function useRetry(R, messages, setMessages, modelConfig, setIsLoading, tw, retryBaseRef) {
  const handleRetry = R.useCallback(async () => {
    if (!modelConfig || !modelConfig.apiUrl || !modelConfig.apiKey) return;
    const lastUserIdx = messages.map((m, i) => m.role === 'user' ? i : -1).filter(i => i >= 0).pop();
    if (lastUserIdx === undefined || lastUserIdx < 0) return;
    const retryMessages = retryBaseRef?.current
      ? cloneMessages(retryBaseRef.current)
      : messages.slice(0, lastUserIdx + 1);
    setMessages(retryMessages);
    tw.clearStreaming();
    setIsLoading(true);
    tw.startStreaming();
    try {
      const preparePreSend = window.preparePreSendMessages || (async ({ messages }) => ({ messages }));
      const toApiMessages = window.toGameCardApiMessages || ((msgs) => msgs.map(msg => ({ role: msg.role, content: msg.content })));
      const preSend = await preparePreSend({ messages: retryMessages });
      if (preSend.error) throw new Error(`游戏卡错误: ${preSend.error}`);
      if (preSend.applied) setMessages(preSend.messages);
      await window.sendChatRequest({
        apiUrl: modelConfig.apiUrl,
        apiKey: modelConfig.apiKey,
        modelName: modelConfig.modelName,
        protocol: modelConfig.protocol || 'openai',
        messages: toApiMessages(preSend.messages, modelConfig.protocol || 'openai')
      }, {
        onToken: (text) => tw.pushContent(text),
        onThinkingToken: (text) => tw.pushContent(text, 'reasoning')
      });
      setIsLoading(false); tw.finishStreaming();
      const content = tw.getAccumulatedContent();
      const savedThinking = tw.getThinkingContent();
      if (content) {
        const assistantMessage = { role: 'assistant', content, _thinking: savedThinking, thinking: savedThinking };
        const prepareAfterResponse = window.prepareAfterResponseMessages || (async ({ messages }) => ({ messages, applied: false }));
        const baseMessages = preSend.applied ? preSend.messages : retryMessages;
        const afterResponse = await prepareAfterResponse({
          messages: [...baseMessages, assistantMessage],
          card: preSend.card || null
        });
        setMessages(afterResponse.applied ? afterResponse.messages : [...baseMessages, assistantMessage]);
        tw.clearStreaming();
      }
    } catch (err) {
      setIsLoading(false); tw.reset();
      setMessages(prev => [...prev, { role: 'assistant', content: `请求失败: ${err.message}`, isError: true }]);
    }
  }, [messages, modelConfig, setMessages, setIsLoading, tw, retryBaseRef]);

  return handleRetry;
}

if (typeof window !== 'undefined') { window.useRetry = useRetry; }
module.exports = useRetry;
