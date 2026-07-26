import React from 'react';
import { gameCardPlatform } from '../platform/index.js';
import { PropTypes } from './componentPropTypes.js';

function getBgmPath(request) {
  const key = request?.state?.audio?.bgm;
  return typeof key === 'string' ? (request?.card?.audio?.bgm?.[key] || '') : '';
}

function GameCardBgmPlayer({ updateRequest, stopToken = 0 }) {
  const audioRef = React.useRef(null);
  const sourceRef = React.useRef({ signature: null, revision: 0, url: '' });
  const pendingPlayRef = React.useRef(false);
  const playingRef = React.useRef(false);
  const enabledRef = React.useRef(true);
  const mountedRef = React.useRef(true);
  const lastStopTokenRef = React.useRef(stopToken);
  const [audioSource, setAudioSource] = React.useState('');
  const [blocked, setBlocked] = React.useState(false);
  const [enabled, setEnabled] = React.useState(true);
  enabledRef.current = enabled;

  const stop = React.useCallback(() => {
    const audio = audioRef.current;
    if (audio && playingRef.current) audio.pause();
    playingRef.current = false;
  }, []);

  const playCurrent = React.useCallback(async (forceEnabled = false) => {
    const audio = audioRef.current;
    if (!audio || !sourceRef.current.url || (!enabledRef.current && !forceEnabled)) return false;
    try {
      audio.currentTime = 0;
      await audio.play();
      playingRef.current = true;
      pendingPlayRef.current = false;
      setBlocked(false);
      return true;
    } catch (_) {
      playingRef.current = false;
      pendingPlayRef.current = false;
      setBlocked(true);
      return false;
    }
  }, []);

  React.useEffect(() => {
    if (!updateRequest) return;
    const cardId = updateRequest.card?.id || '';
    const relativePath = getBgmPath(updateRequest);
    const signature = `${cardId}\0${relativePath}`;
    pendingPlayRef.current = true;
    if (signature === sourceRef.current.signature) {
      if (sourceRef.current.url && updateRequest.restart !== false) {
        stop();
        void playCurrent();
      }
      return;
    }

    stop();
    setBlocked(false);
    const revision = sourceRef.current.revision + 1;
    sourceRef.current = { signature, revision, url: '' };
    setAudioSource('');
    if (!relativePath) {
      pendingPlayRef.current = false;
      return;
    }
    gameCardPlatform.resources.getAudioUrl(cardId, relativePath)
      .then(url => {
        if (!mountedRef.current || sourceRef.current.revision !== revision) return;
        sourceRef.current = { signature, revision, url };
        setAudioSource(url);
      })
      .catch(error => {
        if (!mountedRef.current || sourceRef.current.revision !== revision) return;
        console.error('Failed to load game card audio:', error.message);
        pendingPlayRef.current = false;
      });
  }, [playCurrent, stop, updateRequest]);

  React.useEffect(() => {
    if (audioSource && pendingPlayRef.current) void playCurrent();
  }, [audioSource, playCurrent]);
  React.useEffect(() => {
    if (stopToken === lastStopTokenRef.current) return;
    lastStopTokenRef.current = stopToken;
    pendingPlayRef.current = false;
    stop();
  }, [stop, stopToken]);
  React.useEffect(() => () => {
    mountedRef.current = false;
    stop();
  }, [stop]);

  const toggle = event => {
    event.stopPropagation();
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    if (!nextEnabled) stop();
    else void playCurrent(true);
  };
  const icon = enabled ? 'music_note' : 'music_off';
  const title = blocked ? '浏览器需要手动播放 BGM' : (enabled ? '关闭 BGM' : '开启 BGM');
  return <div className="game-card-bgm-player" data-gc-part="bgm-player">
    <audio ref={audioRef} src={audioSource} loop />
    <button type="button"
      className={`md-btn md-btn-icon game-card-bgm-btn${blocked ? ' blocked' : ''}${!audioSource ? ' no-source' : ''}`}
      data-gc-part="bgm-button" onClick={toggle} title={title} aria-label={title}>
      <span className="material-icons">{icon}</span>
    </button>
  </div>;
}

GameCardBgmPlayer.propTypes = {
  updateRequest: PropTypes.shape({
    id: PropTypes.number.isRequired,
    card: PropTypes.object,
    state: PropTypes.object.isRequired,
    restart: PropTypes.bool
  }),
  stopToken: PropTypes.number
};

export default GameCardBgmPlayer;
