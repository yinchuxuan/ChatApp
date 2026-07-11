import React from 'react';
import { normalizeTextPanel } from '../../shared/game-card/schema/visualConfig.js';
import { gameCardPlatform } from '../platform/index.js';
import { gameCard, gameState, PropTypes } from './componentPropTypes.js';

function GameCardBackgroundRuntime({ card, gameState = {}, defer = false, revealToken = 0, onBackgroundChange, onVisualPanelChange }) {
  const R = React;
  const lastSourceRef = R.useRef('');
  const pendingUrlRef = R.useRef(null), revealRequestedRef = R.useRef(false);
  const relativePath = R.useMemo(() => {
    const key = gameState?.visual?.background;
    return typeof key === 'string' ? (card?.visual?.background?.[key] || '') : '';
  }, [card, gameState]);
  const sourceKey = `${card?.id || ''}:${relativePath}`;
  const textPanel = normalizeTextPanel(gameState?.visual?.textPanel);

  const dispatchBackground = R.useCallback((url) => {
    onBackgroundChange?.({ url });
  }, [onBackgroundChange]);
  const dispatchVisualPanel = R.useCallback((detail) => {
    onVisualPanelChange?.(detail);
  }, [onVisualPanelChange]);

  R.useEffect(() => {
    let canceled = false;
    async function resolveImageUrl() {
      if (defer) { pendingUrlRef.current = null; revealRequestedRef.current = false; }
      if (!relativePath) {
        lastSourceRef.current = '';
        if (defer) pendingUrlRef.current = '';
        else dispatchBackground('');
        return;
      }
      if (sourceKey === lastSourceRef.current) return;
      lastSourceRef.current = sourceKey;
      let nextUrl = '';
      try {
        nextUrl = await gameCardPlatform.resources.getImageUrl(card?.id || '', relativePath);
      } catch (error) {
        console.error('Failed to load game card background:', error.message);
      }
      if (canceled) return;
      if (nextUrl) {
        if (defer && !revealRequestedRef.current) pendingUrlRef.current = nextUrl;
        else dispatchBackground(nextUrl);
      } else {
        if (defer) pendingUrlRef.current = '';
        else dispatchBackground('');
      }
    }
    resolveImageUrl();
    return () => { canceled = true; };
  }, [card?.id, relativePath, sourceKey, defer, dispatchBackground]);

  R.useEffect(() => {
    if (!defer || revealToken <= 0) return;
    revealRequestedRef.current = true;
    if (pendingUrlRef.current !== null) dispatchBackground(pendingUrlRef.current);
  }, [defer, revealToken, dispatchBackground]);

  R.useEffect(() => {
    dispatchVisualPanel({ textPanel, cardId: card?.id || '' });
  }, [card?.id, textPanel, dispatchVisualPanel]);

  R.useEffect(() => () => dispatchBackground(''), [dispatchBackground]);
  R.useEffect(() => () => dispatchVisualPanel({ textPanel: 'center', cardId: '' }), [dispatchVisualPanel]);
  return null;
}

GameCardBackgroundRuntime.propTypes = {
  card: gameCard,
  gameState,
  defer: PropTypes.bool,
  revealToken: PropTypes.number,
  onBackgroundChange: PropTypes.func,
  onVisualPanelChange: PropTypes.func
};

export default GameCardBackgroundRuntime;
