// useRetry - Custom hook for retrying the last assistant response

function useRetry(R, messages, setMessages, modelConfig, setIsLoading, tw) {
  const handleRetry = R.useCallback(() => {
    if (!modelConfig || !modelConfig.apiUrl || !modelConfig.apiKey) return;
    const lastUserIdx = messages.map((m, i) => m.role === 'user' ? i : -1).filter(i => i >= 0).pop();
    if (lastUserIdx === undefined || lastUserIdx < 0) return;
    const retryMessages = messages.slice(0, lastUserIdx + 1);
    setMessages(retryMessages);
    tw.clearStreaming();
    setIsLoading(true);
    tw.startStreaming();
    const retryPayload = {
      apiUrl: modelConfig.apiUrl,
      apiKey: modelConfig.apiKey,
      modelName: modelConfig.modelName,
      protocol: modelConfig.protocol || 'openai',
      messages: retryMessages.map(msg => ({ role: msg.role, content: msg.content }))
    };
    window.sendChatRequest(retryPayload, {
      onToken: (text) => tw.pushContent(text),
      onThinkingToken: (text) => tw.pushContent(text, 'reasoning')
    }).then(() => {
      setIsLoading(false); tw.finishStreaming();
      const content = tw.getAccumulatedContent();
      const savedThinking = tw.getThinkingContent();
      if (content) {
        setMessages(prev => [...prev, { role: 'assistant', content, _thinking: savedThinking, thinking: savedThinking }]);
        tw.clearStreaming();
      }
    }).catch((err) => {
      setIsLoading(false); tw.reset();
      setMessages(prev => [...prev, { role: 'assistant', content: `请求失败: ${err.message}`, isError: true }]);
    });
  }, [messages, modelConfig, setMessages, setIsLoading, tw]);

  return handleRetry;
}

if (typeof window !== 'undefined') { window.useRetry = useRetry; }
module.exports = useRetry;
