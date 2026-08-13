import React from 'react';
import { createPortal } from 'react-dom';
import { PropTypes } from './componentPropTypes.js';

function PlatformRequestErrorNotice({ error, onClose }) {
  if (!error || typeof document === 'undefined') return null;
  return createPortal(
    <section className="platform-request-error" role="alert" aria-live="assertive"
      onClick={event => event.stopPropagation()}>
      <span className="material-icons platform-request-error-icon">error</span>
      <div className="platform-request-error-content">
        <div className="platform-request-error-title">请求未完成</div>
        <div className="platform-request-error-message">{error}</div>
      </div>
      <button type="button" className="platform-request-error-close"
        aria-label="关闭请求错误" title="关闭" onClick={onClose}>
        <span className="material-icons">close</span>
      </button>
    </section>,
    document.body
  );
}

PlatformRequestErrorNotice.propTypes = {
  error: PropTypes.string,
  onClose: PropTypes.func.isRequired
};

export default PlatformRequestErrorNotice;
