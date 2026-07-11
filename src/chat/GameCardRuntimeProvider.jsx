import React from 'react';
import { normalizeGameCardError } from '../components/GameCardErrorPanel.jsx';
import { gameCardPlatform } from '../platform/index.js';

const GameCardRuntimeContext = React.createContext(null);

function GameCardRuntimeProvider({ children, platform = gameCardPlatform }) {
  const [activeCard, setActiveCard] = React.useState(null);
  const [gameState, setGameState] = React.useState({});
  const [runtimeError, setRuntimeError] = React.useState(null);

  const reloadActiveCard = React.useCallback(async () => {
    try {
      const card = await platform.repository.getActiveCard();
      setActiveCard(card || null);
      return card || null;
    } catch (error) {
      setRuntimeError(normalizeGameCardError(error));
      return null;
    }
  }, [platform]);

  React.useEffect(() => { reloadActiveCard(); }, [reloadActiveCard]);

  const changeActiveCard = React.useCallback((card) => {
    setRuntimeError(null);
    setActiveCard(card || null);
  }, []);

  const value = React.useMemo(() => ({
    activeCard,
    changeActiveCard,
    gameState,
    reloadActiveCard,
    runtimeError,
    setGameState,
    setRuntimeError
  }), [activeCard, changeActiveCard, gameState, reloadActiveCard, runtimeError]);

  return <GameCardRuntimeContext.Provider value={value}>{children}</GameCardRuntimeContext.Provider>;
}

function useGameCardRuntime() {
  const runtime = React.useContext(GameCardRuntimeContext);
  if (!runtime) throw new Error('useGameCardRuntime must be used inside GameCardRuntimeProvider');
  return runtime;
}

export { GameCardRuntimeProvider, useGameCardRuntime };
