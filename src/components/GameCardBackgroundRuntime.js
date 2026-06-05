function GameCardBackgroundRuntime({ card, gameState = {} }) {
  const R = window.React || React;
  const lastSourceRef = R.useRef('');

  const relativePath = R.useMemo(() => {
    const key = gameState?.visual?.background;
    return typeof key === 'string' ? (card?.visual?.background?.[key] || '') : '';
  }, [card, gameState]);
  const sourceKey = `${card?.id || ''}:${relativePath}`;

  const dispatchBackground = R.useCallback((url) => {
    window.dispatchEvent(new CustomEvent('game-card-background-changed', { detail: { url } }));
  }, []);

  R.useEffect(() => {
    let canceled = false;
    async function resolveImageUrl() {
      if (!relativePath || !window.electronAPI?.getGameCardImageUrl) {
        lastSourceRef.current = '';
        dispatchBackground('');
        return;
      }
      if (sourceKey === lastSourceRef.current) return;
      lastSourceRef.current = sourceKey;
      const result = await window.electronAPI.getGameCardImageUrl(relativePath);
      if (canceled) return;
      if (result?.success && result.url) dispatchBackground(result.url);
      else {
        console.error('Failed to load game card background:', result?.error || 'unknown error');
        dispatchBackground('');
      }
    }
    resolveImageUrl();
    return () => { canceled = true; };
  }, [relativePath, sourceKey, dispatchBackground]);

  R.useEffect(() => () => dispatchBackground(''), [dispatchBackground]);
  return null;
}

if (typeof window !== 'undefined') { window.GameCardBackgroundRuntime = GameCardBackgroundRuntime; }
module.exports = GameCardBackgroundRuntime;
