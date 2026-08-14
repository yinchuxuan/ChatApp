import React from 'react';
import { createPortal } from 'react-dom';
import { PropTypes } from './componentPropTypes.js';

function PlatformResponseWarningNotice({ warning, onClose }) {
  if (!warning || typeof document === 'undefined') return null;
  const messages = (warning.violations || []).map(item => item.message).filter(Boolean);
  const title = warning.retryExhausted
    ? '自动重试已达上限，已保留当前回复'
    : '当前回复存在契约提醒';
  return createPortal(
    <section className="platform-response-warning" role="status" aria-live="polite"
      onClick={event => event.stopPropagation()}>
      <span className="material-icons platform-response-warning-icon">warning</span>
      <div className="platform-response-warning-content">
        <div className="platform-response-warning-title">{title}</div>
        <div className="platform-response-warning-message">{messages.join('\n')}</div>
      </div>
      <button type="button" className="platform-response-warning-close"
        aria-label="关闭回复提醒" title="关闭" onClick={onClose}>
        <span className="material-icons">close</span>
      </button>
    </section>,
    document.body
  );
}

PlatformResponseWarningNotice.propTypes = {
  warning: PropTypes.object,
  onClose: PropTypes.func.isRequired
};

export default PlatformResponseWarningNotice;
