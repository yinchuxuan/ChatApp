import React from 'react';

function useGenerationAbort() {
  const controllerRef = React.useRef(null);
  const createAbortSignal = React.useCallback(() => {
    controllerRef.current?.abort();
    if (typeof AbortController === 'undefined') return null;
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);
  const clearAbortSignal = React.useCallback((signal) => {
    if (!signal || controllerRef.current?.signal === signal) controllerRef.current = null;
  }, []);
  const stopGeneration = React.useCallback(() => controllerRef.current?.abort(), []);
  React.useEffect(() => () => controllerRef.current?.abort(), []);
  return React.useMemo(
    () => ({ createAbortSignal, clearAbortSignal, stopGeneration }),
    [clearAbortSignal, createAbortSignal, stopGeneration]
  );
}

export default useGenerationAbort;
