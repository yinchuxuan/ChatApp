import { loadCachedRuntimeCard } from './gameCardRuntimeCache.js';
import { applyStatePatch } from '../../shared/game-card/state/statePatch.js';
import { getStateValue } from '../../shared/game-card/state/statePaths.js';

const PRESENTATION_PATHS = [
  'visual.background',
  'visual.portrait',
  'audio.bgm'
];

async function prepareStatePatchAtCursor({
  patchText,
  messages = [],
  state = {},
  card,
  platform
} = {}) {
  if (!card || !patchText) {
    return { state, applied: false, trace: null, card: card || null };
  }

  let runtimeCard;
  try {
    runtimeCard = await loadCachedRuntimeCard(card, platform?.resources);
  } catch (error) {
    return { state, applied: false, trace: null, card: null, error: error.message };
  }

  const patched = applyStatePatch(patchText, state, {
    messages,
    schema: runtimeCard?.state?.schema
  });
  if (!patched.trace.applied) {
    return {
      state,
      applied: false,
      trace: patched.trace,
      card: runtimeCard
    };
  }

  return {
    state: patched.state,
    applied: true,
    trace: patched.trace,
    patchTrace: patched.trace,
    presentationEffects: [],
    presentationChangedKeys: PRESENTATION_PATHS.filter(path => (
      getStateValue(state, path) !== getStateValue(patched.state, path)
    )),
    card: runtimeCard
  };
}

export { prepareStatePatchAtCursor };
