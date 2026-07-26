import generationServices from './generationServices.js';
import { createLeadingStatePatchParser } from './leadingStatePatch.js';

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

async function applyPreview(patchText, preSend, options) {
  const preview = await generationServices.prepareStreamPreviewState({
    patchText,
    messages: preSend.messages,
    state: preSend.state,
    card: preSend.card
  });
  if (preview.error) {
    options.onGameCardError?.(generationServices.normalizeGameCardError(preview));
    return null;
  }
  if (!preview.applied) return null;
  options.onStreamPreviewState?.(preview.state);
  return preview.state;
}

async function sendStreamedGeneration({
  preSend,
  modelConfig,
  tw,
  abortSignal,
  onStreamContentStart,
  onStreamPreviewState,
  onGameCardError
}) {
  const parser = createLeadingStatePatchParser();
  let contentStarted = false;
  let leadingPatchBlock = '';
  let latestState = preSend.state;
  let tokenQueue = Promise.resolve();
  const options = { onGameCardError, onStreamPreviewState };
  const notifyContentStart = () => {
    if (contentStarted) return;
    contentStarted = true;
    onStreamContentStart?.({ card: preSend.card, state: latestState });
  };
  const processOutput = async (output) => {
    if (output.patchBlock) {
      leadingPatchBlock = output.patchBlock;
      const previewState = await applyPreview(output.patchText, preSend, options);
      if (previewState) latestState = previewState;
    }
    if (output.body && tw.pushContent(output.body)) notifyContentStart();
  };
  const enqueueToken = text => {
    tokenQueue = tokenQueue.then(() => processOutput(parser.push(text)));
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
  if (requestError) throw requestError;
  await processOutput(parser.finish());
  return { leadingPatchBlock };
}

export { sendStreamedGeneration };
