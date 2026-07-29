import React from 'react';

function useGenerationAbort() {
  const controllerRef = React.useRef(null);
  const activeGenerationRef = React.useRef(null);
  const createAbortSignal = React.useCallback(() => {
    controllerRef.current?.abort();
    if (typeof AbortController === 'undefined') return null;
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);
  const clearAbortSignal = React.useCallback((signal) => {
    if (!signal || controllerRef.current?.signal === signal) controllerRef.current = null;
  }, []);
  const trackGeneration = React.useCallback((generation) => {
    activeGenerationRef.current = generation;
    const clear = () => {
      if (activeGenerationRef.current === generation) activeGenerationRef.current = null;
    };
    void generation.then(clear, clear);
    return generation;
  }, []);
  const stopGeneration = React.useCallback(async () => {
    const activeGeneration = activeGenerationRef.current;
    controllerRef.current?.abort();
    if (!activeGeneration) return;
    try {
      await activeGeneration;
    } catch (_) {
      // The generation owns its request error handling.
    }
  }, []);
  React.useEffect(() => () => controllerRef.current?.abort(), []);
  return React.useMemo(
    () => ({ createAbortSignal, clearAbortSignal, stopGeneration, trackGeneration }),
    [clearAbortSignal, createAbortSignal, stopGeneration, trackGeneration]
  );
}

export default useGenerationAbort;
