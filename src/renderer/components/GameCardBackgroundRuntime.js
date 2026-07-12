import React from 'react';
import {
  getBackgroundRelativePath,
  getPortraitRelativePath,
  normalizeTextPanel
} from '../../shared/game-card/schema/visualConfig.js';
import { gameCardPlatform } from '../platform/index.js';
import { gameCard, gameState, PropTypes } from './componentPropTypes.js';

function useDeferredImage({ cardId, relativePath, defer, revealToken, onChange, label }) {
  const lastSourceRef = React.useRef('');
  const pendingUrlRef = React.useRef(null), revealRequestedRef = React.useRef(false);
  const sourceKey = `${cardId}:${relativePath}`;
  const dispatchImage = React.useCallback((url) => onChange?.({ url }), [onChange]);

  React.useEffect(() => {
    let canceled = false;
    async function resolveImageUrl() {
      if (defer) { pendingUrlRef.current = null; revealRequestedRef.current = false; }
      if (!relativePath) {
        lastSourceRef.current = '';
        if (defer) pendingUrlRef.current = '';
        else dispatchImage('');
        return;
      }
      if (sourceKey === lastSourceRef.current) return;
      let nextUrl = '';
      try {
        nextUrl = await gameCardPlatform.resources.getImageUrl(cardId, relativePath);
      } catch (error) {
        console.error(`Failed to load game card ${label}:`, error.message);
      }
      if (canceled) return;
      if (nextUrl) {
        if (defer && !revealRequestedRef.current) pendingUrlRef.current = nextUrl;
        else {
          lastSourceRef.current = sourceKey;
          dispatchImage(nextUrl);
        }
      } else {
        if (defer) pendingUrlRef.current = '';
        else {
          lastSourceRef.current = sourceKey;
          dispatchImage('');
        }
      }
    }
    resolveImageUrl();
    return () => { canceled = true; };
  }, [cardId, relativePath, sourceKey, defer, dispatchImage, label]);

  React.useEffect(() => {
    if (!defer || revealToken <= 0) return;
    revealRequestedRef.current = true;
    if (pendingUrlRef.current !== null) {
      lastSourceRef.current = sourceKey;
      dispatchImage(pendingUrlRef.current);
      pendingUrlRef.current = null;
    }
  }, [defer, revealToken, dispatchImage, sourceKey]);

  React.useEffect(() => () => dispatchImage(''), [dispatchImage]);
}

function GameCardBackgroundRuntime({ card, gameState = {}, defer = false, revealToken = 0, onBackgroundChange, onPortraitChange, onVisualPanelChange }) {
  const cardId = card?.id || '';
  const backgroundPath = getBackgroundRelativePath(card, gameState);
  const portraitPath = getPortraitRelativePath(card, gameState);
  const textPanel = normalizeTextPanel(gameState?.visual?.textPanel);
  useDeferredImage({ cardId, relativePath: backgroundPath, defer, revealToken, onChange: onBackgroundChange, label: 'background' });
  useDeferredImage({ cardId, relativePath: portraitPath, defer, revealToken, onChange: onPortraitChange, label: 'portrait' });

  React.useEffect(() => {
    onVisualPanelChange?.({ textPanel, cardId });
  }, [cardId, textPanel, onVisualPanelChange]);

  React.useEffect(() => () => onVisualPanelChange?.({ textPanel: 'center', cardId: '' }), [onVisualPanelChange]);
  return null;
}

GameCardBackgroundRuntime.propTypes = {
  card: gameCard,
  gameState,
  defer: PropTypes.bool,
  revealToken: PropTypes.number,
  onBackgroundChange: PropTypes.func,
  onPortraitChange: PropTypes.func,
  onVisualPanelChange: PropTypes.func
};

export default GameCardBackgroundRuntime;
