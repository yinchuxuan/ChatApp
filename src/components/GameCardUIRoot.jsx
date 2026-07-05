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

function getScriptRunner() {
  if (typeof window !== 'undefined' && window.GameCardUiScripts) return window.GameCardUiScripts;
  if (typeof require !== 'undefined') return require('../gameCard/uiScripts');
  return null;
}

function getMessageRenderers() {
  if (typeof window !== 'undefined' && window.ChatPanelMessageRenderers) return window.ChatPanelMessageRenderers;
  if (typeof require !== 'undefined') return require('./ChatPanelMessageRenderers');
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

async function emitScriptRun(event, options) {
  const scriptRunner = getScriptRunner();
  if (!scriptRunner || typeof options?.setGameState !== 'function') return false;
  const result = await scriptRunner.applyUiScriptRunEvent({
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
  if (type === 'game.script.run') return emitScriptRun(event, options);
  return false;
}

function renderAssistantMessage(R, content, card, options = {}) {
  const renderers = getMessageRenderers();
  if (!renderers?.renderAssistantMsg) return String(content || '');
  const rowClass = ['chat-message-row', options.rowClassName].filter(Boolean).join(' ');
  const msgClass = ['chat-message assistant', options.messageClassName].filter(Boolean).join(' ');
  const bubble = renderers.renderAssistantMsg(
    R,
    { role: 'assistant', content: String(content || '') },
    0,
    false,
    null,
    '',
    false,
    () => {},
    () => {},
    window.marked,
    window.DOMPurify,
    window.highlightQuotes,
    card?.display
  );
  return R.createElement('div', { className: rowClass, 'data-gc-part': 'message-row', 'data-role': 'assistant' },
    R.createElement('div', { className: msgClass, 'data-gc-part': 'message', style: { flex: 1, minWidth: 0 } }, bubble)
  );
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
  const ui = R.useMemo(() => ({
    cardId,
    isLoading,
    root: card?.ui?.root || {},
    renderAssistantMessage: (content, options) => renderAssistantMessage(R, content, card, options)
  }), [R, cardId, isLoading, card]);

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
    ui,
    props: loadedRoot.props || {},
    assets,
    emit
  }));
}

if (typeof window !== 'undefined') { window.GameCardUIRoot = GameCardUIRoot; }
if (typeof module !== 'undefined' && module.exports) module.exports = GameCardUIRoot;
export default GameCardUIRoot;
