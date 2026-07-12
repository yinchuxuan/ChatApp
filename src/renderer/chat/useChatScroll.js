import React from 'react';

const SCROLL_DIVIDER_OFFSET = 80;

function useChatScroll({ messages, isLoading, displayedCount, showMsgHistory }) {
  const [isHistoryExpanded, setIsHistoryExpanded] = React.useState(false);
  const chatHistoryRef = React.useRef(null);
  const pinnedAppliedRef = React.useRef(false);
  const lastPinnedContentRef = React.useRef(null);
  const wasLoadingRef = React.useRef(false);

  React.useEffect(() => {
    if (messages.at(-1)?.role === 'user') setIsHistoryExpanded(false);
  }, [messages]);

  React.useEffect(() => {
    const justFinished = wasLoadingRef.current && !isLoading;
    wasLoadingRef.current = isLoading;
    const history = chatHistoryRef.current;
    if (!history || isHistoryExpanded) return;
    const collapsedView = history.querySelector('.collapsed-message-view');
    if (collapsedView) {
      if (justFinished) return;
      const pinned = collapsedView.querySelector('.retry-source-row .chat-message.user');
      const content = pinned?.textContent || null;
      if (content && (!pinnedAppliedRef.current || lastPinnedContentRef.current !== content)) {
        collapsedView.scrollTop = 0;
        history.scrollTop = 0;
        pinnedAppliedRef.current = true;
        lastPinnedContentRef.current = content;
      }
      return;
    }
    pinnedAppliedRef.current = false;
    lastPinnedContentRef.current = null;
    history.scrollTop = history.scrollHeight;
  }, [displayedCount, isHistoryExpanded, isLoading, messages, showMsgHistory]);

  React.useEffect(() => {
    const view = chatHistoryRef.current?.querySelector('.collapsed-message-view');
    const divider = isHistoryExpanded && view?.querySelector('.pinned-divider');
    if (divider) view.scrollTop = Math.max(0, divider.offsetTop - SCROLL_DIVIDER_OFFSET);
  }, [isHistoryExpanded]);

  return {
    chatHistoryRef,
    collapseHistory: React.useCallback(() => setIsHistoryExpanded(false), []),
    expandHistory: React.useCallback(() => setIsHistoryExpanded(true), []),
    isHistoryExpanded
  };
}

export default useChatScroll;
