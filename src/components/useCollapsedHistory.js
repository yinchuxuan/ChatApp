import React from 'react';

const PULL_THRESHOLD = 60;
const PULL_RESISTANCE = 0.4;
const MAX_PULL = 120;

function useCollapsedHistory(isExpanded, onExpand) {
  const [pull, setPull] = React.useState({ offset: 0, phase: 'none' });
  const accumulatedRef = React.useRef(0);
  const timerRef = React.useRef(null);

  const reset = React.useCallback(() => {
    clearTimeout(timerRef.current);
    accumulatedRef.current = 0;
    setPull({ offset: 0, phase: 'none' });
  }, []);

  React.useEffect(() => {
    if (isExpanded) reset();
    return () => clearTimeout(timerRef.current);
  }, [isExpanded, reset]);

  const onWheel = React.useCallback((event) => {
    if (isExpanded || pull.phase === 'snapping') return;
    event.stopPropagation();
    clearTimeout(timerRef.current);
    if (event.deltaY < 0) {
      accumulatedRef.current += Math.abs(event.deltaY) * 0.5;
      setPull({
        phase: 'dragging',
        offset: Math.min(accumulatedRef.current * PULL_RESISTANCE, MAX_PULL)
      });
    }
    timerRef.current = setTimeout(() => {
      if (accumulatedRef.current * PULL_RESISTANCE >= PULL_THRESHOLD) {
        onExpand?.();
        reset();
        return;
      }
      if (accumulatedRef.current > 0) {
        setPull({ offset: 0, phase: 'snapping' });
        timerRef.current = setTimeout(reset, 200);
      }
    }, 100);
  }, [isExpanded, onExpand, pull.phase, reset]);

  const style = pull.offset > 0 && pull.phase !== 'none' ? {
    transform: `translateY(${pull.offset}px)`,
    transition: pull.phase === 'dragging' ? 'none' : 'transform 200ms cubic-bezier(0.05, 0.7, 0.1, 1)'
  } : {};
  return { onWheel, style };
}

export default useCollapsedHistory;
