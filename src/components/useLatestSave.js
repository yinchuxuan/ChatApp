import React from 'react';

function useLatestSave(save, onSaved, onError) {
  const pendingRef = React.useRef();
  const runningRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  React.useEffect(() => () => { mountedRef.current = false; }, []);

  return React.useCallback((value) => {
    pendingRef.current = value;
    if (runningRef.current) return;
    runningRef.current = true;
    const drain = async () => {
      while (pendingRef.current !== undefined) {
        const next = pendingRef.current;
        pendingRef.current = undefined;
        try {
          await save(next);
          if (mountedRef.current) onSaved?.(next);
        } catch (error) {
          if (mountedRef.current) onError?.(error);
        }
      }
      runningRef.current = false;
    };
    void drain();
  }, [onError, onSaved, save]);
}

export default useLatestSave;
