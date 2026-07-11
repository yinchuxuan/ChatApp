import generationServices from './generationServices.js';

function cloneChatValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function stripTurnContext(content) {
  return typeof content === 'string'
    ? content.replace(/\n*---\s*\n\s*<wa2_turn_context>[\s\S]*?<\/wa2_turn_context>\s*$/g, '')
    : content;
}

function normalizeRetryMessages(messages) {
  return cloneChatValue(messages || []).filter(msg => msg?.ttl === undefined).map(msg => (
    msg?.role === 'user' ? { ...msg, content: stripTurnContext(msg.content) } : msg
  ));
}

function findLastUserIndex(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') return i;
  }
  return -1;
}

async function loadRetryBase(retryBaseRef, retryBaseStateRef) {
  const result = await window.electronAPI?.getChatHistory?.();
  if (result?.success) {
    if (retryBaseRef && Array.isArray(result.retryBaseMessages)) retryBaseRef.current = result.retryBaseMessages;
    if (retryBaseStateRef && result.retryBaseState !== undefined) retryBaseStateRef.current = result.retryBaseState;
  }
  return result?.success ? result : null;
}

function buildRetryMessages(messages, retryBaseMessages, editedContent) {
  const visibleLastUser = findLastUserIndex(messages);
  if (visibleLastUser < 0) return null;
  const retryMessages = retryBaseMessages
    ? normalizeRetryMessages(retryBaseMessages)
    : messages.slice(0, visibleLastUser + 1);
  const retryLastUser = findLastUserIndex(retryMessages);
  if (retryLastUser < 0) return null;
  const nextMessages = retryMessages.slice(0, retryLastUser + 1);
  if (editedContent !== undefined) {
    const content = String(editedContent || '');
    if (!content.trim()) return null;
    nextMessages[retryLastUser] = { ...nextMessages[retryLastUser], content };
  }
  return nextMessages;
}

async function runChatGeneration(options) {
  const { messages, state = {}, modelConfig, setMessages, setGameState, setIsLoading, tw } = options;
  const abortSignal = options.createAbortSignal?.();
  let preSend = null;
  setMessages(messages);
  setIsLoading(true);
  tw.clearStreaming?.();
  tw.startStreaming();
  options.setShowStreamThinking?.(true);
  try {
    preSend = await generationServices.preparePreSendMessages({ messages, state });
    if (preSend.error) return handleGenerationError(preSend, options);
    options.onGameCardError?.(null);
    if (preSend.state && setGameState) setGameState(preSend.state);
    if (preSend.applied) setMessages(preSend.messages);
    await sendGenerationRequest(preSend, modelConfig, tw, options.onStreamContentStart, abortSignal);
    return finishGeneration(preSend, messages, state, options);
  } catch (err) {
    return handleGenerationException(err, options, preSend, messages, abortSignal);
  } finally {
    options.clearAbortSignal?.(abortSignal);
  }
}

async function sendGenerationRequest(preSend, modelConfig, tw, onStreamContentStart, abortSignal) {
  let contentStarted = false;
  const notifyContentStart = () => {
    if (contentStarted) return;
    contentStarted = true;
    onStreamContentStart?.();
  };
  await generationServices.sendChatRequest({
    apiUrl: modelConfig.apiUrl,
    apiKey: modelConfig.apiKey,
    modelName: modelConfig.modelName,
    protocol: modelConfig.protocol || 'openai',
    maxTokens: modelConfig.maxTokens,
    temperature: modelConfig.temperature,
    topP: modelConfig.topP,
    frequencyPenalty: modelConfig.frequencyPenalty,
    presencePenalty: modelConfig.presencePenalty,
    signal: abortSignal,
    messages: generationServices.toGameCardApiMessages(preSend.messages)
  }, {
    onToken: (text) => { if (tw.pushContent(text)) notifyContentStart(); },
    onThinkingToken: (text) => tw.pushContent(text, 'reasoning')
  });
}

async function finishGeneration(preSend, baseMessages, baseState, options) {
  const { setMessages, setGameState, setIsLoading, tw } = options;
  setIsLoading(false);
  tw.finishStreaming();
  const content = tw.getAccumulatedContent();
  if (!content) return true;
  const assistantMessage = { role: 'assistant', content, _thinking: tw.getThinkingContent(), thinking: tw.getThinkingContent() };
  const base = preSend.applied ? preSend.messages : baseMessages;
  const after = await generationServices.prepareAfterResponseMessages({
    messages: [...base, assistantMessage],
    state: preSend.state || baseState,
    card: preSend.card || null
  });
  if (after.state && setGameState) setGameState(after.state);
  if (after.applied) setMessages(after.messages);
  else if (options.appendAssistantWithUpdater) setMessages(prev => [...prev, assistantMessage]);
  else setMessages([...base, assistantMessage]);
  tw.clearStreaming();
  return true;
}

function handleGenerationError(preSend, options) {
  options.setIsLoading(false);
  options.tw.reset();
  if (options.onGameCardError) {
    options.onGameCardError(generationServices.normalizeGameCardError(preSend));
    return false;
  }
  throw new Error(`游戏卡错误: ${preSend.error}`);
}

function isAbortException(err, abortSignal) {
  return abortSignal?.aborted || err?.name === 'AbortError';
}

function handleGenerationAbort(options, preSend, baseMessages) {
  options.setIsLoading(false);
  options.tw.finishStreaming();
  const content = options.tw.getAccumulatedContent();
  if (content) {
    const assistantMessage = { role: 'assistant', content, _thinking: options.tw.getThinkingContent(), thinking: options.tw.getThinkingContent() };
    const base = preSend?.applied ? preSend.messages : baseMessages;
    options.setMessages([...(base || []), assistantMessage]);
  }
  options.tw.clearStreaming();
  return true;
}

function handleGenerationException(err, options, preSend, baseMessages, abortSignal) {
  if (isAbortException(err, abortSignal)) return handleGenerationAbort(options, preSend, baseMessages);
  options.setIsLoading(false);
  options.tw.reset();
  options.setMessages(prev => [...prev, { role: 'assistant', content: `请求失败: ${err.message}`, isError: true }]);
  return false;
}

export {
  buildRetryMessages,
  cloneChatValue,
  findLastUserIndex,
  loadRetryBase,
  normalizeRetryMessages,
  runChatGeneration,
  stripTurnContext
};
