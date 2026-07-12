import React from 'react';
import { gameCardPlatform } from '../platform/index.js';
import { gameCard, gameState, PropTypes } from './componentPropTypes.js';

function GameCardBgmPlayer({ card, gameState = {}, stopToken = 0, resumeToken = 0, defer = false }) {
  const audioRef = React.useRef(null), lastPathRef = React.useRef('');
  const playingRef = React.useRef(false);
  const pendingResumeRef = React.useRef(false);
  const deferRef = React.useRef(defer);
  const [audioSource, setAudioSource] = React.useState({ path: '', url: '' });
  const [blocked, setBlocked] = React.useState(false), [enabled, setEnabled] = React.useState(true);
  deferRef.current = defer;

  const relativePath = React.useMemo(() => {
    const key = gameState?.audio?.bgm;
    return typeof key === 'string' ? (card?.audio?.bgm?.[key] || '') : '';
  }, [card, gameState]);
  const src = audioSource.path === relativePath ? audioSource.url : '';

  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio && playingRef.current) audio.pause();
    playingRef.current = false;
  }, []);

  const playCurrent = React.useCallback(async (forceEnabled = false) => {
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

  React.useEffect(() => {
    let canceled = false;
    async function resolveAudioUrl() {
      if (relativePath === lastPathRef.current) return;
      stop();
      setBlocked(false);
      pendingResumeRef.current = !deferRef.current;
      if (!relativePath) {
        setAudioSource({ path: '', url: '' });
        lastPathRef.current = '';
        pendingResumeRef.current = false;
        return;
      }
      lastPathRef.current = relativePath;
      try {
        const url = await gameCardPlatform.resources.getAudioUrl(card?.id || '', relativePath);
        if (!canceled) setAudioSource({ path: relativePath, url });
      } catch (error) {
        if (canceled) return;
        console.error('Failed to load game card audio:', error.message);
        setAudioSource({ path: relativePath, url: '' });
        pendingResumeRef.current = false;
      }
    }
    resolveAudioUrl();
    return () => { canceled = true; };
  }, [card?.id, relativePath, stop]);

  React.useEffect(() => { pendingResumeRef.current = false; stop(); }, [stopToken, stop]);
  React.useEffect(() => {
    if (resumeToken > 0) {
      pendingResumeRef.current = true;
      playCurrent();
    }
  }, [resumeToken]);
  React.useEffect(() => {
    if (pendingResumeRef.current && src) playCurrent();
  }, [src, playCurrent]);
  React.useEffect(() => () => stop(), [stop]);

  const toggle = event => {
    event.stopPropagation();
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    if (!nextEnabled) stop();
    else playCurrent(true);
  };
  const icon = enabled ? 'music_note' : 'music_off';
  const title = blocked ? '浏览器需要手动播放 BGM' : (enabled ? '关闭 BGM' : '开启 BGM');
  return <div className="game-card-bgm-player" data-gc-part="bgm-player">
    <audio ref={audioRef} src={src} loop />
    <button type="button"
      className={`md-btn md-btn-icon game-card-bgm-btn${blocked ? ' blocked' : ''}${!src ? ' no-source' : ''}`}
      data-gc-part="bgm-button" onClick={toggle} title={title} aria-label={title}>
      <span className="material-icons">{icon}</span>
    </button>
  </div>;
}

GameCardBgmPlayer.propTypes = {
  card: gameCard,
  gameState,
  stopToken: PropTypes.number,
  resumeToken: PropTypes.number,
  defer: PropTypes.bool
};

export default GameCardBgmPlayer;
