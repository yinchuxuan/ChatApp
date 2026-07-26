import React from 'react';
import {
  getBackgroundRelativePath,
  getPortraitRelativePath,
  normalizeTextPanel
} from '../../shared/game-card/schema/visualConfig.js';
import { gameCardPlatform } from '../platform/index.js';
import { PropTypes } from './componentPropTypes.js';

async function resolveImageUrl(cardId, relativePath, label) {
  if (!relativePath) return '';
  try {
    return await gameCardPlatform.resources.getImageUrl(cardId, relativePath);
  } catch (error) {
    console.error(`Failed to load game card ${label}:`, error.message);
    return '';
  }
}

function useImageRequest(request, getPath, label, onChange) {
  const currentRef = React.useRef({ signature: null, revision: 0 });
  const handlerRef = React.useRef(onChange);
  const mountedRef = React.useRef(true);
  handlerRef.current = onChange;

  React.useEffect(() => {
    if (!request) return;
    const cardId = request.card?.id || '';
    const relativePath = getPath(request.card, request.state);
    const signature = `${cardId}\0${relativePath}`;
    if (signature === currentRef.current.signature) return;
    const revision = currentRef.current.revision + 1;
    currentRef.current = { signature, revision };
    resolveImageUrl(cardId, relativePath, label).then(url => {
      if (!mountedRef.current || currentRef.current.revision !== revision) return;
      handlerRef.current?.({ url });
    });
  }, [getPath, label, request]);

  React.useEffect(() => () => {
    mountedRef.current = false;
    handlerRef.current?.({ url: '' });
  }, []);
}

function GameCardBackgroundRuntime({
  backgroundRequest,
  portraitRequest,
  onBackgroundChange,
  onPortraitChange,
  onVisualPanelChange
}) {
  useImageRequest(backgroundRequest, getBackgroundRelativePath, 'background', onBackgroundChange);
  useImageRequest(portraitRequest, getPortraitRelativePath, 'portrait', onPortraitChange);

  React.useEffect(() => {
    if (!backgroundRequest) return;
    const cardId = backgroundRequest.card?.id || '';
    const textPanel = normalizeTextPanel(backgroundRequest.state?.visual?.textPanel);
    onVisualPanelChange?.({ textPanel, cardId });
  }, [backgroundRequest, onVisualPanelChange]);

  React.useEffect(() => () => {
    onVisualPanelChange?.({ textPanel: 'center', cardId: '' });
  }, [onVisualPanelChange]);
  return null;
}

const updateRequest = PropTypes.shape({
  id: PropTypes.number.isRequired,
  card: PropTypes.object,
  state: PropTypes.object.isRequired
});

GameCardBackgroundRuntime.propTypes = {
  backgroundRequest: updateRequest,
  portraitRequest: updateRequest,
  onBackgroundChange: PropTypes.func,
  onPortraitChange: PropTypes.func,
  onVisualPanelChange: PropTypes.func
};

export default GameCardBackgroundRuntime;
