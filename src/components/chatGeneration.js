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
  setMessages(messages);
  setIsLoading(true);
  tw.clearStreaming?.();
  tw.startStreaming();
  options.setShowStreamThinking?.(true);
  try {
    const preparePreSend = window.preparePreSendMessages || (async ({ messages: input }) => ({ messages: input }));
    const preSend = await preparePreSend({ messages, state });
    if (preSend.error) return handleGenerationError(preSend, options);
    options.onGameCardError?.(null);
    if (preSend.state && setGameState) setGameState(preSend.state);
    if (preSend.applied) setMessages(preSend.messages);
    await sendGenerationRequest(preSend, modelConfig, tw, options.onStreamContentStart);
    return finishGeneration(preSend, messages, state, options);
  } catch (err) {
    return handleGenerationException(err, options);
  }
}

async function sendGenerationRequest(preSend, modelConfig, tw, onStreamContentStart) {
  let contentStarted = false;
  const notifyContentStart = () => {
    if (contentStarted) return;
    contentStarted = true;
    onStreamContentStart?.();
  };
  const toApiMessages = window.toGameCardApiMessages || ((input) => input.map(msg => ({ role: msg.role, content: msg.content })));
  await window.sendChatRequest({
    apiUrl: modelConfig.apiUrl,
    apiKey: modelConfig.apiKey,
    modelName: modelConfig.modelName,
    protocol: modelConfig.protocol || 'openai',
    maxTokens: modelConfig.maxTokens,
    temperature: modelConfig.temperature,
    topP: modelConfig.topP,
    frequencyPenalty: modelConfig.frequencyPenalty,
    presencePenalty: modelConfig.presencePenalty,
    messages: toApiMessages(preSend.messages, modelConfig.protocol || 'openai')
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
  const prepareAfterResponse = window.prepareAfterResponseMessages || (async ({ messages }) => ({ messages, applied: false }));
  const after = await prepareAfterResponse({ messages: [...base, assistantMessage], state: preSend.state || baseState, card: preSend.card || null });
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
    options.onGameCardError(window.normalizeGameCardError?.(preSend) || preSend);
    return false;
  }
  throw new Error(`游戏卡错误: ${preSend.error}`);
}

function handleGenerationException(err, options) {
  options.setIsLoading(false);
  options.tw.reset();
  options.setMessages(prev => [...prev, { role: 'assistant', content: `请求失败: ${err.message}`, isError: true }]);
  return false;
}

const ChatGeneration = { cloneChatValue, stripTurnContext, normalizeRetryMessages, findLastUserIndex, loadRetryBase, buildRetryMessages, runChatGeneration };

if (typeof window !== 'undefined') window.ChatGeneration = ChatGeneration;
if (typeof module !== 'undefined') module.exports = ChatGeneration;
