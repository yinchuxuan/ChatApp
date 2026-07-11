function useGenerationAbort(R) {
  const controllerRef = R.useRef(null);
  const createAbortSignal = R.useCallback(() => {
    controllerRef.current?.abort();
    if (typeof AbortController === 'undefined') return null;
    controllerRef.current = new AbortController();
    return controllerRef.current.signal;
  }, []);
  const clearAbortSignal = R.useCallback((signal) => {
    if (!signal || controllerRef.current?.signal === signal) controllerRef.current = null;
  }, []);
  const stopGeneration = R.useCallback(() => {
    controllerRef.current?.abort();
  }, []);
  R.useEffect(() => () => controllerRef.current?.abort(), []);
  return R.useMemo(() => ({ createAbortSignal, clearAbortSignal, stopGeneration }), [clearAbortSignal, createAbortSignal, stopGeneration]);
}

export default useGenerationAbort;
