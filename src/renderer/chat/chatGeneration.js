import generationServices from './generationServices.js';
import { createChatMessage } from './messageIds.js';
import { cloneJson as cloneChatValue } from '../../shared/game-card/utils/jsonValue.js';
import { sendStreamedGeneration } from './streamGeneration.js';

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
    await options.onPresentationEffects?.(preSend.presentationEffects, {
      card: preSend.card,
      phase: 'pre_send',
      state: preSend.state
    });
    const streamResult = await sendStreamedGeneration({
      preSend,
      modelConfig,
      tw,
      abortSignal,
      onStreamContentStart: options.onStreamContentStart,
      onStreamPreviewState: options.onStreamPreviewState,
      onGameCardError: options.onGameCardError
    });
    return await finishGeneration(preSend, messages, state, options, streamResult);
  } catch (err) {
    return handleGenerationException(err, options, preSend, messages, abortSignal);
  } finally {
    options.clearAbortSignal?.(abortSignal);
  }
}

async function finishGeneration(preSend, baseMessages, baseState, options, streamResult = {}) {
  const { setMessages, setGameState, setIsLoading, tw } = options;
  tw.finishStreaming();
  const content = `${streamResult.leadingPatchBlock || ''}${tw.getAccumulatedContent()}`;
  if (!content) {
    setIsLoading(false);
    tw.clearStreaming();
    return true;
  }
  const assistantMessage = createChatMessage({ role: 'assistant', content, _thinking: tw.getThinkingContent(), thinking: tw.getThinkingContent() });
  const base = preSend.applied ? preSend.messages : baseMessages;
  const after = await generationServices.prepareAfterResponseMessages({
    messages: [...base, assistantMessage],
    state: preSend.state || baseState,
    card: preSend.card || null
  });
  if (after.state && setGameState) setGameState(after.state);
  await options.onPresentationEffects?.(after.presentationEffects, {
    card: after.card || preSend.card,
    phase: 'after_response',
    state: after.state
  });
  if (after.applied) setMessages(after.messages);
  else if (options.appendAssistantWithUpdater) setMessages(prev => [...prev, assistantMessage]);
  else setMessages([...base, assistantMessage]);
  setIsLoading(false);
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
    const assistantMessage = createChatMessage({ role: 'assistant', content, _thinking: options.tw.getThinkingContent(), thinking: options.tw.getThinkingContent() });
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
  options.setMessages(prev => [...prev, createChatMessage({ role: 'assistant', content: `请求失败: ${err.message}`, isError: true })]);
  return false;
}

export {
  buildRetryMessages,
  cloneChatValue,
  findLastUserIndex,
  normalizeRetryMessages,
  runChatGeneration,
  stripTurnContext
};
