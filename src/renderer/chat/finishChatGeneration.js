import generationServices from './generationServices.js';
import { createChatMessage } from './messageIds.js';

function hasAfterStreamRule(card) {
  return card?.rules?.some(rule => rule?.when?.phase === 'after_stream') === true;
}

async function applyAfterStream(messages, state, card, options) {
  if (!hasAfterStreamRule(card)) {
    return { messages, state, applied: false, card };
  }
  const result = await generationServices.prepareAfterStreamMessages({ messages, state, card });
  if (result.error) options.onGameCardError?.(generationServices.normalizeGameCardError(result));
  await options.onPresentationEffects?.(result.presentationEffects, {
    card: result.card || card,
    phase: 'after_stream',
    state: result.state
  });
  return {
    ...result,
    messages: result.applied ? result.messages : messages,
    state: result.state || state
  };
}

async function finishChatGeneration(preSend, baseMessages, baseState, options, streamResult = {},
  streamMessageId) {
  const { setMessages, setGameState, setIsLoading, tw } = options;
  tw.finishStreaming();
  const content = tw.getRawContent?.() || streamResult.rawContent || tw.getAccumulatedContent();
  if (!content) {
    setIsLoading(false);
    tw.clearStreaming();
    return true;
  }
  const segmented = preSend.card?.display?.segmentedReading === true;
  const assistantMessage = createChatMessage({
    id: streamMessageId,
    role: 'assistant',
    content,
    _thinking: tw.getThinkingContent(),
    thinking: tw.getThinkingContent(),
    _meta: {
      statePatchPlayback: {
        afterResponseApplied: !segmented,
        appliedPatchCount: streamResult.appliedPatchCount || 0
      }
    }
  });
  const base = preSend.applied ? preSend.messages : baseMessages;
  const streamedState = streamResult.state || preSend.state || baseState;
  const streamed = await applyAfterStream(
    [...base, assistantMessage], streamedState, preSend.card, options
  );
  if (segmented) {
    if (streamed.applied) {
      setGameState?.(streamed.state);
      setMessages(streamed.messages);
    } else if (options.appendAssistantWithUpdater) {
      setMessages(previous => [...previous, assistantMessage]);
    } else setMessages(streamed.messages);
    setIsLoading(false);
    tw.clearStreaming();
    return true;
  }
  const after = await generationServices.prepareAfterResponseMessages({
    messages: streamed.messages,
    state: streamed.state,
    card: streamed.card || preSend.card || null,
    statePatchesApplied: true
  });
  if (after.state && setGameState) setGameState(after.state);
  await options.onPresentationEffects?.(after.presentationEffects, {
    card: after.card || preSend.card,
    phase: 'after_response',
    state: after.state
  });
  if (after.applied) setMessages(after.messages);
  else if (options.appendAssistantWithUpdater) setMessages(previous => [...previous, assistantMessage]);
  else setMessages(streamed.messages);
  setIsLoading(false);
  tw.clearStreaming();
  return true;
}

export { applyAfterStream, finishChatGeneration, hasAfterStreamRule };
