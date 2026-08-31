import React from 'react';
import { gameCard, PropTypes } from './componentPropTypes.js';

function GameCardSwitchRow({ active, busy, card, onActivate, onUninstall, removing }) {
  const name = card?.name || card?.id || '普通聊天';
  return <div className="game-card-switch-item">
    <button type="button"
      className={`game-card-switch-row${active ? ' active' : ''}`}
      onClick={event => onActivate(event, card)} disabled={busy}>
      <span className="game-card-switch-state" aria-hidden="true" />
      <span className="game-card-switch-name">{name}</span>
    </button>
    {card ? <button type="button" className="game-card-switch-remove"
      onClick={event => onUninstall(event, card)} disabled={busy}
      title={`卸载 ${name}`} aria-label={`卸载 ${name}`}>
      <span className={`material-icons${removing ? ' importing' : ''}`}>
        {removing ? 'progress_activity' : 'delete'}
      </span>
    </button> : null}
  </div>;
}

GameCardSwitchRow.propTypes = {
  active: PropTypes.bool,
  busy: PropTypes.bool,
  card: gameCard,
  onActivate: PropTypes.func.isRequired,
  onUninstall: PropTypes.func.isRequired,
  removing: PropTypes.bool
};

export default GameCardSwitchRow;
