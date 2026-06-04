function GameCardBgmPlayer({ card, gameState = {}, stopToken = 0, resumeToken = 0 }) {
  const R = window.React || React;
  const audioRef = R.useRef(null), lastPathRef = R.useRef('');
  const playingRef = R.useRef(false);
  const pendingResumeRef = R.useRef(false);
  const [audioSource, setAudioSource] = R.useState({ path: '', url: '' });
  const [blocked, setBlocked] = R.useState(false), [enabled, setEnabled] = R.useState(true);

  const relativePath = R.useMemo(() => {
    const key = gameState?.audio?.bgm;
    return typeof key === 'string' ? (card?.audio?.bgm?.[key] || '') : '';
  }, [card, gameState]);
  const src = audioSource.path === relativePath ? audioSource.url : '';

  const stop = R.useCallback(() => {
    const audio = audioRef.current;
    if (audio && playingRef.current) audio.pause();
    playingRef.current = false;
  }, []);

  const playCurrent = R.useCallback(async (forceEnabled = false) => {
    const audio = audioRef.current;
    if (!audio || !src || (!enabled && !forceEnabled)) return false;
    try {
      audio.currentTime = 0;
      await audio.play();
      playingRef.current = true;
      pendingResumeRef.current = false;
      setBlocked(false);
      return true;
    } catch (_) {
      playingRef.current = false;
      pendingResumeRef.current = false;
      setBlocked(true);
      return false;
    }
  }, [src, enabled]);

  R.useEffect(() => {
    let canceled = false;
    async function resolveAudioUrl() {
      stop();
      setBlocked(false);
      if (!relativePath || !window.electronAPI?.getGameCardAudioUrl) {
        setAudioSource({ path: '', url: '' });
        lastPathRef.current = '';
        return;
      }
      if (relativePath === lastPathRef.current) return;
      lastPathRef.current = relativePath;
      const result = await window.electronAPI.getGameCardAudioUrl(relativePath);
      if (canceled) return;
      if (result?.success && result.url) setAudioSource({ path: relativePath, url: result.url });
      else {
        console.error('Failed to load game card audio:', result?.error || 'unknown error');
        setAudioSource({ path: relativePath, url: '' });
      }
    }
    resolveAudioUrl();
    return () => { canceled = true; };
  }, [relativePath, stop]);

  R.useEffect(() => { pendingResumeRef.current = false; stop(); }, [stopToken, stop]);
  R.useEffect(() => {
    if (resumeToken > 0) {
      pendingResumeRef.current = true;
      playCurrent();
    }
  }, [resumeToken]);
  R.useEffect(() => {
    if (pendingResumeRef.current && src) playCurrent();
  }, [src, playCurrent]);
  R.useEffect(() => () => stop(), [stop]);

  const toggle = (event) => {
    event.stopPropagation();
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    if (!nextEnabled) stop();
    else playCurrent(true);
  };

  const C = R.createElement;
  const icon = enabled ? 'music_note' : 'music_off';
  const title = blocked ? '浏览器需要手动播放 BGM' : (enabled ? '关闭 BGM' : '开启 BGM');
  return C('div', { className: 'game-card-bgm-player' },
    C('audio', { ref: audioRef, src, loop: true }),
    C('button', {
      type: 'button',
      className: `md-btn md-btn-icon game-card-bgm-btn${blocked ? ' blocked' : ''}${!src ? ' no-source' : ''}`,
      onClick: toggle,
      title,
      'aria-label': title
    }, C('span', { className: 'material-icons' }, icon))
  );
}

if (typeof window !== 'undefined') { window.GameCardBgmPlayer = GameCardBgmPlayer; }
module.exports = GameCardBgmPlayer;
