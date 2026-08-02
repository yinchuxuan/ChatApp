function isRetryEditorTarget(target) {
  return Boolean(target?.closest?.('.wa2-retry-editor'));
}

function isRetryControlTarget(target) {
  return Boolean(target?.closest?.('.wa2-retry-editor, .wa2-retry-action'));
}

function isReadingControlTarget(target) {
  return Boolean(target?.closest?.(
    'a, button, input, textarea, select, label, [contenteditable="true"], [role="button"]'
  ));
}

// eslint-disable-next-line no-unused-vars
function Root({ React, messages = [], emit, ui = {} }) {
  const C = React.createElement;
  const retryPanelRef = React.useRef(null);
  const rootRef = React.useRef(null);
  const [paused, setPaused] = React.useState(false);
  const [retryContent, setRetryContent] = React.useState('');
  const [retryError, setRetryError] = React.useState('');

  React.useEffect(() => {
    if (paused) retryPanelRef.current?.focus();
  }, [paused]);

  React.useEffect(() => {
    const view = rootRef.current?.ownerDocument?.defaultView;
    if (!view) return undefined;

    function openPause() {
      setRetryContent(String(ui.retrySource || ''));
      setRetryError('');
      setPaused(true);
    }

    function handleKeyDown(event) {
      if (event.defaultPrevented || event.repeat || event.isComposing) return;
      if (paused && event.key === 'Enter' && !isRetryControlTarget(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const readingEvent = event.key === 'ArrowLeft'
        ? { type: 'reading.previous', available: ui.reading?.canPrevious }
        : event.key === 'ArrowRight'
          ? { type: 'reading.next', available: ui.reading?.canNext }
          : null;
      if (!paused && readingEvent?.available
        && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
        && !isReadingControlTarget(event.target)) {
        const accepted = emit({ type: readingEvent.type });
        if (accepted !== false) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (paused) setPaused(false);
      else openPause();
    }

    function handleContextMenu(event) {
      if (paused && isRetryEditorTarget(event.target)) return;
      if (!event.target?.closest?.('[data-gc-part="chat-panel"]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (paused) setPaused(false);
      else openPause();
    }

    view.addEventListener('keydown', handleKeyDown, true);
    view.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      view.removeEventListener('keydown', handleKeyDown, true);
      view.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [emit, paused, ui.reading, ui.retrySource]);

  function closePause(event) {
    event?.stopPropagation();
    setPaused(false);
  }

  function retry(event) {
    event.stopPropagation();
    if (!ui.canRetry || !retryContent.trim()) return;
    const result = emit({ type: 'chat.retry', content: retryContent });
    if (result === false) {
      setRetryError('当前行动暂时无法重新演绎');
      return;
    }
    setPaused(false);
    Promise.resolve(result)
      .then((success) => {
        if (success !== false) return;
        setRetryError('当前行动暂时无法重新演绎');
        setPaused(true);
      })
      .catch(() => {
        setRetryError('重新演绎失败，请稍后再试');
        setPaused(true);
      });
  }

  function renderRetryPanel() {
    if (!paused) return null;
    return C('section', {
      className: 'wa2-retry-layer',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'wa2-retry-title',
      onClick: (event) => event.stopPropagation()
    }, C('div', {
      className: 'wa2-retry-panel', ref: retryPanelRef, tabIndex: -1
    },
    C('div', { className: 'wa2-retry-kicker' }, '演出暂停'),
    C('h2', { className: 'wa2-retry-title', id: 'wa2-retry-title' }, '上一次行动'),
    ui.retrySource
      ? C('textarea', {
        className: 'wa2-retry-editor',
        value: retryContent,
        rows: 4,
        'aria-label': '编辑上一次行动',
        onChange: (event) => setRetryContent(event.target.value)
      })
      : C('p', { className: 'wa2-retry-empty' }, '当前没有可以重新演绎的行动。'),
    retryError ? C('p', { className: 'wa2-retry-error', role: 'status' }, retryError) : null,
    C('div', { className: 'wa2-retry-actions' },
      C('button', {
        type: 'button', className: 'wa2-retry-action wa2-retry-return', onClick: closePause
      }, '返回演出'),
      C('button', {
        type: 'button',
        className: 'wa2-retry-action wa2-retry-submit',
        disabled: !ui.canRetry || !retryContent.trim(),
        onClick: retry
      }, '重新生成'))));
  }

  function renderThinkingIndicator() {
    if (!ui.isLoading || paused) return null;
    const lastUserMessage = [...messages].reverse().find(message => message?.role === 'user');
    const userInput = String(lastUserMessage?.content || '')
      .replace(/\n*---\s*\n\s*<wa2_turn_context>[\s\S]*?<\/wa2_turn_context>\s*$/g, '')
      .replace(/<wa2_turn_context>[\s\S]*?<\/wa2_turn_context>/g, '')
      .trim();
    const label = userInput || '思考中';
    return C('div', {
      className: 'wa2-thinking-indicator', role: 'status', 'aria-label': `${label}，等待回复`
    },
    C('span', { className: 'wa2-thinking-label' }, label),
    C('span', { className: 'wa2-thinking-dots', 'aria-hidden': 'true' },
      C('span', null, '…'), C('span', null, '…')));
  }

  return C('div', {
    className: 'wa2-ui-root', ref: rootRef, 'data-paused': paused ? 'true' : 'false'
  }, renderThinkingIndicator(), renderRetryPanel());
}
