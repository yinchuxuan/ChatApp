import React from 'react';
import {
  formatGameCardErrorText,
  formatStage,
  normalizeGameCardError
} from '../gameCard/runtimeError.js';
import { PropTypes, runtimeError } from './componentPropTypes.js';

function copyGameCardError(error) {
  const normalized = normalizeGameCardError(error);
  if (!normalized || typeof navigator === 'undefined' || !navigator.clipboard) return;
  navigator.clipboard.writeText(formatGameCardErrorText(normalized));
}

function GameCardErrorPanel({ error, variant = 'active', onClose }) {
  const normalized = normalizeGameCardError(error);
  const [expanded, setExpanded] = React.useState(false);
  if (!normalized) return null;
  const visible = expanded ? normalized.details : normalized.details.slice(0, 5);
  const hiddenCount = normalized.details.length - visible.length;
  return <section className={`game-card-error-panel ${variant}`} role="alert"
    onClick={event => event.stopPropagation()}>
    {onClose ? <button type="button" className="game-card-error-close"
      aria-label="关闭导入错误" title="关闭" onClick={onClose}>
      <span className="material-icons">close</span>
    </button> : null}
    <div className="game-card-error-heading">
      <span className="material-icons">error</span>
      <div>
        <div className="game-card-error-title">{normalized.title}</div>
        <div className="game-card-error-message">{normalized.message}</div>
      </div>
    </div>
    <div className="game-card-error-meta">
      {normalized.stage ? <span>{`阶段: ${formatStage(normalized.stage)}`}</span> : null}
      {normalized.file ? <span>{`文件: ${normalized.file}`}</span> : null}
    </div>
    {visible.length ? <ol className="game-card-error-details">
      {visible.map((item, index) => <li key={`${item.file || ''}:${item.message || ''}:${index}`}>
        {item.file ? <span className="game-card-error-file">{`${item.file}: `}</span> : null}
        <span>{item.message || ''}</span>
      </li>)}
    </ol> : null}
    <div className="game-card-error-actions">
      {hiddenCount > 0 ? <button type="button" onClick={() => setExpanded(true)}>
        {`展开 ${hiddenCount} 条`}
      </button> : null}
      <button type="button" onClick={() => copyGameCardError(normalized)}>复制错误</button>
    </div>
  </section>;
}

GameCardErrorPanel.propTypes = {
  error: runtimeError,
  variant: PropTypes.string,
  onClose: PropTypes.func
};

export default GameCardErrorPanel;
