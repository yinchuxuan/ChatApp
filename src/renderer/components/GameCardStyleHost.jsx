import React from 'react';
import { gameCard } from './componentPropTypes.js';
import { createGameCardStyleHost } from '../gameCard/gameCardStyleHost.js';
import { gameCardPlatform } from '../platform/index.js';

function GameCardStyleHost({ card }) {
  const host = React.useMemo(
    () => createGameCardStyleHost(gameCardPlatform.resources, document),
    []
  );

  React.useLayoutEffect(() => {
    void host.load(card);
  }, [card, host]);

  React.useLayoutEffect(() => () => host.destroy(), [host]);
  return null;
}

GameCardStyleHost.propTypes = { card: gameCard };

export default GameCardStyleHost;
