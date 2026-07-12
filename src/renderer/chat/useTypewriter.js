const STREAM_FLUSH_INTERVAL_MS = 50;
const STREAM_FLUSH_CHARS = 96;

function useTypewriter(R) {
  const [streamContent, setStreamContent] = R.useState('');
  const [displayedCount, setDisplayedCount] = R.useState(0);
  const [thinkingContent, setThinkingContent] = R.useState('');
  const [thinkingDone, setThinkingDone] = R.useState(false);
  const streamContentRef = R.useRef('');
  const lastFlushedLengthRef = R.useRef(0);
  const flushTimerRef = R.useRef(null);
  const thinkingRef = R.useRef('');
  const inThinkingRef = R.useRef(false);
  const thinkingDoneRef = R.useRef(false);

  const cancelFlush = R.useCallback(() => {
    if (flushTimerRef.current === null) return;
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }, []);

  const flushVisibleContent = R.useCallback(() => {
    cancelFlush();
    const content = streamContentRef.current;
    lastFlushedLengthRef.current = content.length;
    setStreamContent(content);
    setDisplayedCount(content.length);
  }, [cancelFlush]);

  const scheduleFlush = R.useCallback(() => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = setTimeout(flushVisibleContent, STREAM_FLUSH_INTERVAL_MS);
  }, [flushVisibleContent]);

  const appendContent = R.useCallback((text) => {
    if (!text) return '';
    streamContentRef.current += text;
    const pendingLength = streamContentRef.current.length - lastFlushedLengthRef.current;
    if (lastFlushedLengthRef.current === 0 || pendingLength >= STREAM_FLUSH_CHARS) {
      flushVisibleContent();
    } else {
      scheduleFlush();
    }
    return text;
  }, [flushVisibleContent, scheduleFlush]);

  R.useEffect(() => cancelFlush, [cancelFlush]);

  const clearContent = R.useCallback(() => {
    cancelFlush();
    streamContentRef.current = '';
    lastFlushedLengthRef.current = 0;
    setStreamContent('');
    setDisplayedCount(0);
  }, [cancelFlush]);

  const startStreaming = R.useCallback(() => {
    clearContent();
    thinkingRef.current = '';
    inThinkingRef.current = false;
    thinkingDoneRef.current = false;
    setThinkingContent('');
    setThinkingDone(false);
  }, [clearContent]);

  const pushContent = R.useCallback((delta, type) => {
    if (type === 'reasoning') {
      thinkingRef.current += delta;
      setThinkingContent(thinkingRef.current);
      return '';
    }
    let foundOpen = -1;
    let foundClose = -1;
    if (!inThinkingRef.current && !thinkingDoneRef.current) foundOpen = delta.indexOf('<thinking>');
    if (inThinkingRef.current) foundClose = delta.indexOf('</thinking>');

    if (foundOpen !== -1 && !inThinkingRef.current && !thinkingDoneRef.current) {
      let appended = appendContent(delta.slice(0, foundOpen));
      inThinkingRef.current = true;
      const after = delta.slice(foundOpen + 10);
      foundClose = after.indexOf('</thinking>');
      if (foundClose === -1) {
        thinkingRef.current += after;
        setThinkingContent(thinkingRef.current);
        return appended;
      }
      thinkingRef.current += after.slice(0, foundClose);
      inThinkingRef.current = false;
      thinkingDoneRef.current = true;
      setThinkingContent(thinkingRef.current);
      setThinkingDone(true);
      appended += appendContent(after.slice(foundClose + 11));
      return appended;
    }
    if (foundClose !== -1 && inThinkingRef.current) {
      thinkingRef.current += delta.slice(0, foundClose);
      inThinkingRef.current = false;
      thinkingDoneRef.current = true;
      setThinkingContent(thinkingRef.current);
      setThinkingDone(true);
      return appendContent(delta.slice(foundClose + 11));
    }
    if (inThinkingRef.current) {
      thinkingRef.current += delta;
      setThinkingContent(thinkingRef.current);
      return '';
    }
    return appendContent(delta);
  }, [appendContent]);

  const finishStreaming = R.useCallback(() => flushVisibleContent(), [flushVisibleContent]);
  const getAccumulatedContent = R.useCallback(() => streamContentRef.current, []);
  const getThinkingContent = R.useCallback(() => thinkingRef.current, []);
  const reset = R.useCallback(() => {
    clearContent();
    thinkingRef.current = '';
    inThinkingRef.current = false;
    thinkingDoneRef.current = false;
    setThinkingContent('');
    setThinkingDone(false);
  }, [clearContent]);

  return { streamContent, displayedCount, startStreaming, pushContent, finishStreaming,
    getAccumulatedContent, getThinkingContent, reset, clearStreaming: clearContent,
    thinkingContent, thinkingDone };
}

export { STREAM_FLUSH_CHARS, STREAM_FLUSH_INTERVAL_MS };
export default useTypewriter;
