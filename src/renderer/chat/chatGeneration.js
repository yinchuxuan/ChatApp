import generationServices from './generationServices.js';
import { createChatMessage, createMessageId } from './messageIds.js';
import { cloneJson as cloneChatValue } from '../../shared/game-card/utils/jsonValue.js';
import { finishChatGeneration } from './finishChatGeneration.js';
import { generateValidatedResponse } from './validatedGeneration.js';

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
  const requestMessages = cloneChatValue(messages);
  const requestState = cloneChatValue(state);
  const abortSignal = options.createAbortSignal?.();
  const streamMessageId = createMessageId();
  let preSend = null;
  setMessages(requestMessages);
  setIsLoading(true);
  options.onRequestError?.(null);
  tw.clearStreaming?.();
  tw.startStreaming(streamMessageId);
  options.setShowStreamThinking?.(true);
  try {
    preSend = await generationServices.preparePreSendMessages({
      messages: requestMessages,
      state: requestState
    });
    if (preSend.error) return handleGenerationError(preSend, options);
    options.onGameCardError?.(null);
    if (preSend.state && setGameState) setGameState(preSend.state);
    if (preSend.applied) setMessages(preSend.messages);
    await options.onPresentationEffects?.(preSend.presentationEffects, {
      card: preSend.card,
      phase: 'pre_send',
      state: preSend.state
    });
    const generated = await generateValidatedResponse({
      preSend,
      modelConfig,
      tw,
      abortSignal,
      options,
      initialMessageId: streamMessageId
    });
    return await finishChatGeneration(
      preSend, requestMessages, requestState, options,
      generated.streamResult, generated.streamMessageId
    );
  } catch (err) {
    return handleGenerationException(
      err, options, preSend, requestMessages, requestState, abortSignal, streamMessageId
    );
  } finally {
    options.clearAbortSignal?.(abortSignal);
  }
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

function handleGenerationAbort(options, preSend, baseMessages, streamResult = {}, streamMessageId) {
  options.setIsLoading(false);
  options.tw.finishStreaming();
  const content = options.tw.getRawContent?.()
    || streamResult.rawContent
    || options.tw.getAccumulatedContent();
  if (content) {
    const assistantMessage = createChatMessage({
      id: streamMessageId,
      role: 'assistant',
      content,
      _thinking: options.tw.getThinkingContent(),
      thinking: options.tw.getThinkingContent(),
      _meta: {
        statePatchPlayback: {
          afterResponseApplied: false,
          appliedPatchCount: streamResult.appliedPatchCount || 0
        }
      }
    });
    const base = preSend?.applied ? preSend.messages : baseMessages;
    options.setMessages([...(base || []), assistantMessage]);
  }
  options.tw.clearStreaming();
  return true;
}

function handleGenerationException(err, options, preSend, baseMessages, baseState,
  abortSignal, streamMessageId) {
  if (isAbortException(err, abortSignal)) {
    return handleGenerationAbort(
      options, preSend, baseMessages, err.streamResult, err.streamMessageId || streamMessageId
    );
  }
  const restoredState = cloneChatValue(baseState);
  options.setMessages(baseMessages);
  options.setGameState?.(restoredState);
  options.onRequestFailureRestore?.(restoredState);
  options.setIsLoading(false);
  options.tw.reset();
  options.onRequestError?.(`请求失败: ${err.message}`);
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
