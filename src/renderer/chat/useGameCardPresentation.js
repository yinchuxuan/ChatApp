import React from 'react';

function useGameCardPresentation() {
  const sequenceRef = React.useRef(0);
  const [backgroundRequest, setBackgroundRequest] = React.useState(null);
  const [portraitRequest, setPortraitRequest] = React.useState(null);
  const [bgmRequest, setBgmRequest] = React.useState(null);
  const [bgmStopToken, setBgmStopToken] = React.useState(0);

  const request = React.useCallback((setter, card, state, extra = {}) => {
    sequenceRef.current += 1;
    setter({
      id: sequenceRef.current,
      card: card || null,
      state: state || {},
      ...extra
    });
  }, []);

  const updateBackground = React.useCallback((card, state) => {
    request(setBackgroundRequest, card, state);
  }, [request]);
  const updatePortrait = React.useCallback((card, state) => {
    request(setPortraitRequest, card, state);
  }, [request]);
  const updateBgm = React.useCallback((card, state) => {
    request(setBgmRequest, card, state);
  }, [request]);
  const updateAll = React.useCallback((card, state) => {
    updateBackground(card, state);
    updatePortrait(card, state);
    updateBgm(card, state);
  }, [updateBackground, updateBgm, updatePortrait]);
  const updateChanged = React.useCallback((card, state, changedKeys = []) => {
    const sceneChanged = changedKeys.includes('visual.scene');
    if (sceneChanged) updateBackground(card, state);
    if (sceneChanged || changedKeys.includes('visual.portraits')) updatePortrait(card, state);
    if (changedKeys.includes('audio.bgm')) updateBgm(card, state);
  }, [updateBackground, updateBgm, updatePortrait]);
  const applyEffects = React.useCallback((effects = [], context = {}) => {
    effects.forEach(effect => {
      if (effect.type === 'visual.updateBackground') {
        updateBackground(context.card, context.state);
        updatePortrait(context.card, context.state);
      } else if (effect.type === 'visual.updatePortrait') {
        updatePortrait(context.card, context.state);
      } else if (effect.type === 'audio.updateBgm') {
        updateBgm(context.card, context.state);
      }
    });
  }, [updateBackground, updateBgm, updatePortrait]);
  const stopBgm = React.useCallback(() => {
    setBgmStopToken(value => value + 1);
  }, []);

  return {
    applyEffects,
    backgroundRequest,
    bgmRequest,
    bgmStopToken,
    portraitRequest,
    stopBgm,
    updateAll,
    updateBackground,
    updateBgm,
    updateChanged,
    updatePortrait
  };
}

export default useGameCardPresentation;
