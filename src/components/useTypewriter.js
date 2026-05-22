// useTypewriter - Custom hook for typewriter-style text animation
// Uses requestAnimationFrame to progressively reveal text ~2 chars per frame

function useTypewriter(R) {
  const [streamContent, setStreamContent] = R.useState('');
  const [displayedCount, setDisplayedCount] = R.useState(0);
  const [thinkingContent, setThinkingContent] = R.useState('');
  const [thinkingDone, setThinkingDone] = R.useState(false);

  const isLoadingRef = R.useRef(false);
  const isStreamingRef = R.useRef(false);
  const streamContentRef = R.useRef('');
  const displayedCountRef = R.useRef(0);
  const animFrameRef = R.useRef(null);
  const thinkingRef = R.useRef('');
  const inThinkingRef = R.useRef(false);
  const thinkingDoneRef = R.useRef(false);

  R.useEffect(() => { isLoadingRef.current = streamContent !== '' || isStreamingRef.current; }, [streamContent]);
  R.useEffect(() => { streamContentRef.current = streamContent; }, [streamContent]);
  R.useEffect(() => { displayedCountRef.current = displayedCount; }, [displayedCount]);

  R.useEffect(() => {
    if (!streamContent) return;
    if (typeof requestAnimationFrame !== 'function') return;

    const tick = () => {
      const content = streamContentRef.current;
      const count = displayedCountRef.current;

      if (count < content.length) {
        setDisplayedCount(Math.min(count + 2, content.length));
        animFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [streamContent, displayedCount]);

  const startStreaming = R.useCallback(() => {
    isStreamingRef.current = true;
    streamContentRef.current = '';
    displayedCountRef.current = 0;
    thinkingRef.current = '';
    inThinkingRef.current = false;
    thinkingDoneRef.current = false;
    setStreamContent('');
    setDisplayedCount(0);
    setThinkingContent('');
    setThinkingDone(false);
  }, []);

  const pushContent = R.useCallback((delta, type) => {
    if (type === 'reasoning') {
      thinkingRef.current += delta;
      setThinkingContent(thinkingRef.current);
      return;
    }
    // Handle <thinking> tags from legacy streaming (text content mode)
    let foundOpen = -1;
    let foundClose = -1;

    if (!inThinkingRef.current && !thinkingDoneRef.current) {
      foundOpen = delta.indexOf('<thinking>');
    }
    if (inThinkingRef.current) {
      foundClose = delta.indexOf('</thinking>');
    }

    if (foundOpen !== -1 && !inThinkingRef.current && !thinkingDoneRef.current) {
      streamContentRef.current += delta.slice(0, foundOpen);
      setStreamContent(prev => prev + delta.slice(0, foundOpen));
      inThinkingRef.current = true;
      const after = delta.slice(foundOpen + 10);
      foundClose = after.indexOf('</thinking>');
      if (foundClose !== -1) {
        thinkingRef.current += after.slice(0, foundClose);
        inThinkingRef.current = false;
        thinkingDoneRef.current = true;
        setThinkingContent(thinkingRef.current);
        setThinkingDone(true);
        streamContentRef.current += after.slice(foundClose + 11);
        setStreamContent(prev => prev + after.slice(foundClose + 11));
      } else {
        thinkingRef.current += after;
        setThinkingContent(thinkingRef.current);
      }
    } else if (foundClose !== -1 && inThinkingRef.current) {
      thinkingRef.current += delta.slice(0, foundClose);
      inThinkingRef.current = false;
      thinkingDoneRef.current = true;
      setThinkingContent(thinkingRef.current);
      setThinkingDone(true);
      streamContentRef.current += delta.slice(foundClose + 11);
      setStreamContent(prev => prev + delta.slice(foundClose + 11));
    } else if (inThinkingRef.current) {
      thinkingRef.current += delta;
      setThinkingContent(thinkingRef.current);
    } else {
      streamContentRef.current += delta;
      setStreamContent(prev => prev + delta);
    }
  }, []);

  const finishStreaming = R.useCallback(() => {
    isStreamingRef.current = false;
  }, []);

  const getAccumulatedContent = R.useCallback(() => streamContentRef.current, []);
  const getThinkingContent = R.useCallback(() => thinkingRef.current, []);

  const clearStreaming = R.useCallback(() => {
    streamContentRef.current = '';
    displayedCountRef.current = 0;
    setStreamContent('');
    setDisplayedCount(0);
  }, []);

  const reset = R.useCallback(() => {
    isStreamingRef.current = false;
    streamContentRef.current = '';
    displayedCountRef.current = 0;
    thinkingRef.current = '';
    inThinkingRef.current = false;
    thinkingDoneRef.current = false;
    setStreamContent('');
    setDisplayedCount(0);
    setThinkingContent('');
    setThinkingDone(false);
  }, []);

  return { streamContent, displayedCount, setStreamContent, setDisplayedCount, startStreaming, pushContent, finishStreaming, getAccumulatedContent, getThinkingContent, reset, clearStreaming, thinkingContent, thinkingDone };
}

if (typeof window !== 'undefined') {
  window.useTypewriter = useTypewriter;
}

module.exports = useTypewriter;
