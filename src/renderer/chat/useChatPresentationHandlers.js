import React from 'react';

function useChatPresentationHandlers(card, presentation) {
  const {
    updateAll,
    updateBackground,
    updateChanged,
    updatePortrait
  } = presentation;
  const onStreamContentStart = React.useCallback(({ card: streamCard, state }) => {
    if (streamCard?.presentation?.autoUpdateOnFirstToken === false) return;
    updateAll(streamCard, state, { restart: false });
  }, [updateAll]);

  const onSessionLoaded = React.useCallback(({ card: loadedCard, state }) => {
    updateAll(loadedCard, state);
  }, [updateAll]);

  const onRetryStateRestore = React.useCallback((state) => {
    if (card?.presentation?.autoUpdateOnFirstToken === false) return;
    updateBackground(card, state);
    updatePortrait(card, state);
  }, [card, updateBackground, updatePortrait]);

  const onStatePatchApplied = React.useCallback((result) => {
    updateChanged(
      result.card || card,
      result.state,
      result.presentationChangedKeys
    );
  }, [card, updateChanged]);

  return {
    onRetryStateRestore,
    onSessionLoaded,
    onStatePatchApplied,
    onStreamContentStart
  };
}

export default useChatPresentationHandlers;
