const PRESENTATION_ACTIONS = new Set([
  'visual.updateBackground',
  'visual.updatePortrait',
  'audio.updateBgm'
]);

function isPresentationAction(action) {
  return PRESENTATION_ACTIONS.has(action?.type);
}

function applyPresentationAction(messages, state, action) {
  const effect = {
    type: action.type,
    ...(action.type === 'audio.updateBgm'
      ? { restart: action.restart !== false }
      : {})
  };
  return {
    messages,
    state,
    trace: {
      type: action.type,
      applied: true,
      matched: 1,
      presentationEffect: effect,
      summary: {
        messages: {
          before: messages.length,
          after: messages.length,
          inserted: 0,
          removed: 0,
          replaced: 0
        },
        state: { changedKeys: [] }
      }
    }
  };
}

function collectPresentationEffects(trace) {
  const effects = [];
  const visit = action => {
    if (action?.presentationEffect) effects.push(action.presentationEffect);
    (action?.actions || []).forEach(visit);
  };
  (trace?.rules || []).forEach(rule => (rule.actions || []).forEach(visit));
  return effects;
}

export {
  applyPresentationAction,
  collectPresentationEffects,
  isPresentationAction
};
