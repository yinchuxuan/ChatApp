import React from 'react';

const SEGMENT_TRANSITION_MS = 280;
const INTERACTIVE_SELECTOR = [
  'a', 'button', 'input', 'textarea', 'select', 'label',
  '[role="button"]', '[contenteditable="true"]',
  '[data-gc-part="chat-header"]', '.chat-message-editable-bubble',
  '[data-gc-chat-input-value]', '[data-gc-chat-input-value-from]',
  '[data-gc-chat-input-label]'
].join(',');

function splitReadingSegments(content) {
  return String(content || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .filter(segment => segment.trim());
}

function isSegmentAdvanceEvent(event) {
  if (!event) return true;
  if (event.defaultPrevented || (event.type === 'click' && event.button !== 0)) return false;
  const interactive = event.target?.closest?.(INTERACTIVE_SELECTOR);
  if (interactive && interactive !== event.currentTarget) return false;
  const view = event.currentTarget?.ownerDocument?.defaultView
    || event.target?.ownerDocument?.defaultView
    || event.currentTarget;
  const selection = view?.getSelection?.();
  return !selection || selection.isCollapsed;
}

function useSegmentedReading({ enabled, isLoading, messageKey, scopeKey, surfaceRef }) {
  const [pageIndex, setPageIndex] = React.useState(0);
  const pageIndexRef = React.useRef(0);
  const transitionRef = React.useRef(false);
  const timerRef = React.useRef(null);
  const previousRef = React.useRef({ enabled, isLoading, messageKey, scopeKey });

  const reset = React.useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    transitionRef.current = false;
    pageIndexRef.current = 0;
    setPageIndex(0);
  }, []);

  React.useEffect(() => {
    const previous = previousRef.current;
    const generationStarted = enabled && isLoading && !previous.isLoading;
    const idleMessageChanged = enabled && !isLoading && !previous.isLoading
      && messageKey !== previous.messageKey;
    if (enabled !== previous.enabled || scopeKey !== previous.scopeKey
      || generationStarted || idleMessageChanged) reset();
    previousRef.current = { enabled, isLoading, messageKey, scopeKey };
  }, [enabled, isLoading, messageKey, reset, scopeKey]);

  React.useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const advance = React.useCallback((event, pageCount) => {
    if (transitionRef.current || pageIndexRef.current >= pageCount - 1
      || !isSegmentAdvanceEvent(event)) return false;
    transitionRef.current = true;
    pageIndexRef.current += 1;
    setPageIndex(pageIndexRef.current);
    timerRef.current = setTimeout(() => {
      transitionRef.current = false;
      timerRef.current = null;
    }, SEGMENT_TRANSITION_MS);
    return true;
  }, []);

  const advanceVisiblePage = React.useCallback((event) => {
    const bubble = surfaceRef?.current?.querySelector(
      '.segmented-reading-ready[data-segment-count]'
    );
    const pageCount = Number(bubble?.dataset.segmentCount);
    if (!Number.isInteger(pageCount) || pageCount < 2) return false;
    return advance(event, pageCount);
  }, [advance, surfaceRef]);

  React.useEffect(() => {
    if (!enabled) return undefined;
    const view = surfaceRef?.current?.ownerDocument?.defaultView;
    if (!view) return undefined;
    const handleKeyDown = (event) => {
      if (event.key !== 'Enter' || event.repeat || event.isComposing
        || event.altKey || event.ctrlKey || event.metaKey) return;
      if (advanceVisiblePage(event)) event.preventDefault();
    };
    view.addEventListener('keydown', handleKeyDown);
    return () => view.removeEventListener('keydown', handleKeyDown);
  }, [advanceVisiblePage, enabled, surfaceRef]);

  return { advance, advanceVisiblePage, pageIndex };
}

export {
  INTERACTIVE_SELECTOR,
  SEGMENT_TRANSITION_MS,
  isSegmentAdvanceEvent,
  splitReadingSegments
};
export default useSegmentedReading;
