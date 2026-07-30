import generationServices from './generationServices.js';
import { createStatePatchStreamParser } from './statePatchStream.js';

function requestOptions(modelConfig, messages, abortSignal) {
  return {
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
    messages: generationServices.toGameCardApiMessages(messages)
  };
}

async function applyPatch(patchText, state, preSend, options) {
  const result = await generationServices.prepareStatePatchAtCursor({
    patchText,
    messages: preSend.messages,
    state,
    card: preSend.card
  });
  if (result.error) {
    options.onGameCardError?.(generationServices.normalizeGameCardError(result));
    return { state, result };
  }
  if (result.applied) {
    options.onStreamPreviewState?.(result.state);
    options.onStatePatchApplied?.(result);
  }
  return { state: result.applied ? result.state : state, result };
}

async function sendStreamedGeneration({
  preSend,
  modelConfig,
  tw,
  abortSignal,
  onStreamContentStart,
  onStreamPreviewState,
  onStatePatchApplied,
  onGameCardError
}) {
  const parser = createStatePatchStreamParser();
  const segmented = preSend.card?.display?.segmentedReading === true;
  let contentStarted = false;
  let latestState = preSend.state;
  let patchCount = 0;
  let rawContent = '';
  let tokenQueue = Promise.resolve();
  const options = { onGameCardError, onStatePatchApplied, onStreamPreviewState };
  const notifyContentStart = () => {
    if (contentStarted) return;
    contentStarted = true;
    onStreamContentStart?.({ card: preSend.card, state: latestState });
  };
  const processEvents = async (events) => {
    for (const event of events) {
      if (event.type === 'patch') {
        rawContent += event.block;
        tw.pushProtocolContent?.(event.block);
        patchCount += 1;
        if (!segmented || !contentStarted) {
          const applied = await applyPatch(event.text, latestState, preSend, options);
          latestState = applied.state;
          tw.markPatchApplied?.(patchCount);
        }
        continue;
      }
      rawContent += event.text;
      if (tw.pushContent(event.text) && event.text.trim()) notifyContentStart();
    }
  };
  const enqueueToken = text => {
    tokenQueue = tokenQueue.then(() => processEvents(parser.push(text)));
  };

  let requestError = null;
  try {
    await generationServices.sendChatRequest(
      requestOptions(modelConfig, preSend.messages, abortSignal),
      {
        onToken: enqueueToken,
        onThinkingToken: text => tw.pushContent(text, 'reasoning')
      }
    );
  } catch (error) {
    requestError = error;
  }
  try {
    await tokenQueue;
  } catch (error) {
    if (!requestError) throw error;
  }
  if (requestError) {
    requestError.streamResult = {
      appliedPatchCount: tw.getAppliedPatchCount?.() || 0,
      rawContent,
      state: latestState
    };
    throw requestError;
  }
  await processEvents(parser.finish());
  return {
    appliedPatchCount: tw.getAppliedPatchCount?.() || 0,
    rawContent,
    state: latestState
  };
}

export { sendStreamedGeneration };
