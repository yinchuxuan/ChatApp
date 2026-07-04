function getRuntime() {
  if (typeof window !== 'undefined' && window.GameCardUiRuntime) return window.GameCardUiRuntime;
  if (typeof require !== 'undefined') return require('../gameCard/uiRuntime');
  return null;
}

function getStateActions() {
  if (typeof window !== 'undefined' && window.GameCardUiStateActions) return window.GameCardUiStateActions;
  if (typeof require !== 'undefined') return require('../gameCard/uiStateActions');
  return null;
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object') return value;
  Object.freeze(value);
  Object.keys(value).forEach(key => freeze(value[key]));
  return value;
}

function readonly(value) {
  return freeze(clone(value));
}

function emitInputAction(event) {
  if (typeof window === 'undefined') return false;
  window.dispatchEvent(new CustomEvent('game-card-chat-input-action', { detail: event }));
  return true;
}

async function emitStateAction(event, options) {
  const stateActions = getStateActions();
  if (!stateActions || typeof options?.setGameState !== 'function') return false;
  const result = await stateActions.applyUiStateActionEvent({
    event,
    state: options.stateRef.current,
    messages: options.messages,
    card: options.card,
    api: typeof window !== 'undefined' ? window.electronAPI : null
  });
  if (result.trace?.error) throw new Error(result.trace.error);
  if (result.trace?.reason) return false;
  options.stateRef.current = result.state;
  options.setGameState(result.state);
  return result.applied;
}

function handleUiEvent(event, options) {
  const type = event?.type;
  const inputTypes = ['chat.input.set', 'chat.input.append', 'chat.input.clear', 'chat.input.focus', 'chat.input.submit', 'chat.send'];
  if (inputTypes.includes(type)) return emitInputAction(event);
  if (type === 'game.state.apply') return emitStateAction(event, options);
  return false;
}

function GameCardUIRoot({ card, gameState = {}, setGameState, messages = [], isLoading = false }) {
  const R = window.React || React;
  const runtime = getRuntime();
  const [loadedRoot, setLoadedRoot] = R.useState(null);
  const [error, setError] = R.useState(null);
  const stateRef = R.useRef(gameState || {});
  const cardId = card?.id || '';
  const rootSource = card?.ui?.root?.source || '';
  const rootStyle = card?.ui?.root?.style || '';
  const C = R.createElement;

  R.useEffect(() => { stateRef.current = gameState || {}; }, [gameState]);

  R.useEffect(() => {
    let canceled = false;
    setLoadedRoot(null);
    setError(null);
    async function loadRoot() {
      if (!runtime) return;
      try {
        await runtime.loadGameCardUiRootStyle(card, window.electronAPI, document);
        const root = await runtime.loadGameCardUiRoot(card, window.electronAPI, R);
        if (!canceled) setLoadedRoot(root);
      } catch (err) {
        if (!canceled) setError(err);
      }
    }
    loadRoot();
    return () => {
      canceled = true;
    };
  }, [cardId, rootSource, rootStyle]);

  R.useEffect(() => () => runtime?.removeGameCardUiRootStyle?.(document), [runtime]);

  const safeState = R.useMemo(() => readonly(gameState || {}), [gameState]);
  const safeMessages = R.useMemo(() => readonly(messages || []), [messages]);
  const emit = R.useCallback((event) => {
    try {
      const result = handleUiEvent(event, { card, messages, setGameState, stateRef });
      if (result && typeof result.catch === 'function') {
        return result.catch((err) => {
          setError(err);
          return false;
        });
      }
      return result;
    } catch (err) {
      setError(err);
      return false;
    }
  }, [card, messages, setGameState]);
  const assets = R.useMemo(() => ({
    readFile: (filePath) => window.electronAPI?.readGameCardFile?.(cardId, filePath),
    getImageUrl: (filePath) => window.electronAPI?.getGameCardImageUrl?.(filePath),
    getAudioUrl: (filePath) => window.electronAPI?.getGameCardAudioUrl?.(filePath)
  }), [cardId]);

  if (!loadedRoot?.Component) return null;
  return C('div', {
    id: 'game-card-ui-root',
    'data-gc-part': 'game-card-ui-root',
    'data-error': error ? String(error.message || error) : undefined,
    style: { position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none' }
  }, C(loadedRoot.Component, {
    React: R,
    state: safeState,
    messages: safeMessages,
    ui: { cardId, isLoading, root: card?.ui?.root || {} },
    props: loadedRoot.props || {},
    assets,
    emit
  }));
}

if (typeof window !== 'undefined') { window.GameCardUIRoot = GameCardUIRoot; }
if (typeof module !== 'undefined' && module.exports) module.exports = GameCardUIRoot;
export default GameCardUIRoot;
