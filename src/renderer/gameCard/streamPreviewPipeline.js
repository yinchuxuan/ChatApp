import { applyGameCardAsync } from './engine.js';
import { loadCachedCardResources } from './gameCardRuntimeCache.js';
import { applyStatePatchPreview } from '../../shared/game-card/state/statePatch.js';

function runtimeDependencies(platform) {
  return platform?.scriptExecutor ? { scriptExecutor: platform.scriptExecutor } : {};
}

async function prepareStreamPreviewState({
  patchText,
  messages = [],
  state = {},
  card,
  platform
} = {}) {
  if (!card || !patchText) {
    return { state, applied: false, trace: null, card: card || null };
  }

  let resources;
  try {
    resources = await loadCachedCardResources(card, platform?.resources);
  } catch (error) {
    return { state, applied: false, trace: null, card: null, error: error.message };
  }

  const patched = applyStatePatchPreview(
    patchText,
    state,
    resources.card?.state?.schema
  );
  if (!patched.trace.applied) {
    return {
      state,
      applied: false,
      trace: patched.trace,
      card: resources.card
    };
  }

  const result = await applyGameCardAsync({
    card: resources.card,
    phase: 'stream_preview',
    messages,
    state: patched.state,
    fileContents: resources.fileContents,
    dependencies: runtimeDependencies(platform)
  });
  return {
    ...result,
    ...(result.trace.errors.length ? { error: result.trace.errors.join('\n') } : {}),
    applied: true,
    patchTrace: patched.trace,
    card: resources.card
  };
}

export { prepareStreamPreviewState };
