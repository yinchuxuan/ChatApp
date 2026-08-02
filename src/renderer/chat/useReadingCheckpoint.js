import React from 'react';

function useReadingCheckpoint({
  enabled,
  isLoading,
  entries,
  activeCursor,
  activeEntry,
  messages,
  onReadProgress,
  onPositionChange
}) {
  const sequenceRef = React.useRef(0);

  React.useEffect(() => {
    if (!enabled || !activeEntry) return;
    const sequence = sequenceRef.current + 1;
    sequenceRef.current = sequence;
    const isLatest = activeCursor.entryIndex === entries.length - 1;
    const terminal = !isLoading && isLatest
      && activeCursor.pageIndex === activeEntry.pageCount - 1;
    const pending = onReadProgress?.({
      entry: activeEntry,
      message: activeEntry.streaming ? null : messages[activeEntry.messageIndex],
      targetBoundary: terminal ? activeEntry.pageCount : activeCursor.pageIndex,
      terminal
    });
    Promise.resolve(pending).then(() => {
      if (sequence !== sequenceRef.current || isLoading || activeEntry.streaming) return;
      onPositionChange?.({
        messageId: String(activeEntry.key || ''),
        segmentIndex: activeCursor.pageIndex
      });
    }).catch(() => {});
  }, [activeCursor.entryIndex, activeCursor.pageIndex, activeEntry, enabled, entries.length,
    isLoading, messages, onPositionChange, onReadProgress]);
}

export default useReadingCheckpoint;
