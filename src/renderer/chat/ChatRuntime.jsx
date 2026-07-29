import DOMPurify from 'dompurify';
import { marked } from 'marked';
import React from 'react';
import { PropTypes } from '../components/componentPropTypes.js';
import ChatInputArea from '../ChatInputArea.jsx';
import ChatPanelMessageRenderers from '../components/ChatPanelMessageRenderers.jsx';
import ChatPanelRenderers from '../components/ChatPanelRenderers.jsx';
import GameCardBackgroundRuntime from '../components/GameCardBackgroundRuntime.js';
import GameCardBgmPlayer from '../components/GameCardBgmPlayer.jsx';
import GameCardErrorPanel from '../components/GameCardErrorPanel.jsx';
import GameCardStyleHost from '../components/GameCardStyleHost.jsx';
import GameCardTitleControl from '../components/GameCardTitleControl.jsx';
import GameCardUIRoot from '../components/GameCardUIRoot.jsx';
import MessageCollapseRenderer from '../components/MessageCollapseRenderer.jsx';
import { highlightQuotes } from '../components/highlightQuotes.js';
import useLastUserMessageEdit from './useLastUserMessageEdit.js';
import { findLastRoleIndex, messageKey } from './messageSelection.js';
import useSegmentedReading from './useSegmentedReading.js';
import useTypewriter from './useTypewriter.js';
import { rendererServices } from '../platform/index.js';
import { useGameCardRuntime } from './GameCardRuntimeProvider.jsx';
import useChatGeneration from './useChatGeneration.js';
import useChatPersistence from './useChatPersistence.js';
import useChatScroll from './useChatScroll.js';
import useChatSession from './useChatSession.js';
import useGameCardPresentation from './useGameCardPresentation.js';
import useModelConfig from './useModelConfig.js';

function ChatRuntime({
  BgmPlayer = GameCardBgmPlayer,
  BackgroundRuntime = GameCardBackgroundRuntime,
  onBackgroundChange,
  onPortraitChange,
  onVisualPanelChange
}) {
  const [messages, setMessages] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showMsgHistory, setShowMsgHistory] = React.useState(false);
  const [msgHistoryMessages, setMsgHistoryMessages] = React.useState(null);
  const [showStreamThinking, setShowStreamThinking] = React.useState(true);
  const [isHeaderHovered, setIsHeaderHovered] = React.useState(false);
  const [isInputHovered, setIsInputHovered] = React.useState(false);
  const [isInputTriggerHovered, setIsInputTriggerHovered] = React.useState(false);
  const [actionError, setActionError] = React.useState(null);
  const chatPanelRef = React.useRef(null);
  const runtime = useGameCardRuntime();
  const segmentedReading = runtime.activeCard?.display?.segmentedReading === true;
  const modelConfig = useModelConfig();
  const typewriter = useTypewriter(React);
  const presentation = useGameCardPresentation();
  const persistence = useChatPersistence({ messages, gameState: runtime.gameState, isLoading });
  const handleStreamStart = React.useCallback(({ card, state }) => {
    if (card?.presentation?.autoUpdateOnFirstToken === false) return;
    presentation.updateAll(card, state);
  }, [presentation.updateAll]);
  const handleSessionLoaded = React.useCallback(({ card, state }) => {
    presentation.updateAll(card, state);
  }, [presentation.updateAll]);
  const handleRetryStateRestore = React.useCallback((state) => {
    if (runtime.activeCard?.presentation?.autoUpdateOnFirstToken === false) return;
    presentation.updateBackground(runtime.activeCard, state);
    presentation.updatePortrait(runtime.activeCard, state);
  }, [presentation.updateBackground, presentation.updatePortrait, runtime.activeCard]);
  const generation = useChatGeneration({
    messages,
    setMessages,
    gameState: runtime.gameState,
    setGameState: runtime.setGameState,
    modelConfig,
    typewriter,
    persistence,
    isLoading,
    setIsLoading,
    setRuntimeError: runtime.setRuntimeError,
    setShowStreamThinking,
    onAudioSubmit: presentation.stopBgm,
    onRetryStateRestore: handleRetryStateRestore,
    onPresentationEffects: presentation.applyEffects,
    onStreamContentStart: handleStreamStart
  });
  const scroll = useChatScroll({ messages, isLoading, displayedCount: typewriter.displayedCount, showMsgHistory });
  const session = useChatSession({
    setMessages,
    setGameState: runtime.setGameState,
    setRuntimeError: runtime.setRuntimeError,
    isLoading,
    persistence,
    typewriter,
    onResetView: scroll.collapseHistory,
    onSessionLoaded: handleSessionLoaded
  });
  const editUserMessage = useLastUserMessageEdit(React, messages, isLoading);
  const latestAssistantIndex = findLastRoleIndex(messages, 'assistant');
  const latestAssistant = messages[latestAssistantIndex];
  const segmented = useSegmentedReading({
    enabled: segmentedReading,
    isLoading,
    messageKey: latestAssistant
      ? messageKey(latestAssistant, `assistant-${latestAssistantIndex}`)
      : '',
    scopeKey: session.revision,
    surfaceRef: chatPanelRef
  });

  const handleRetry = React.useCallback(async (content) => {
    const retryContent = typeof content === 'string'
      ? content
      : (editUserMessage.isActive ? editUserMessage.content : undefined);
    const ok = await generation.retry(retryContent);
    if (ok) editUserMessage.finish();
    return ok;
  }, [editUserMessage, generation]);

  const handleCardChanged = React.useCallback(async () => {
    runtime.setRuntimeError(null);
    await session.reload();
  }, [runtime, session]);

  const toggleHistory = () => {
    const next = !showMsgHistory;
    setShowMsgHistory(next);
    if (next) rendererServices.sessions.loadHistory()
      .then(result => setMsgHistoryMessages(result.messages))
      .catch(error => setActionError(error));
  };
  const toggleThinking = (index) => setMessages(prev => prev.map((msg, current) => (
    current === index ? { ...msg, _thinkingVisible: !msg._thinkingVisible } : msg
  )));
  const streamThinking = typewriter.getThinkingContent();
  const currentThinking = isLoading && streamThinking ? streamThinking : null;
  const display = runtime.activeCard?.display;
  const displayRevision = React.useMemo(() => JSON.stringify(display ?? null), [display]);
  const renderUser = text => ChatPanelMessageRenderers.renderUserMsg(
    React, { content: text }, marked, DOMPurify, highlightQuotes, display, displayRevision
  );
  const renderAssistant = (msg, index, streaming) => ChatPanelMessageRenderers.renderAssistantMsg(
    React, msg, index, streaming, typewriter, currentThinking, showStreamThinking,
    setShowStreamThinking, toggleThinking, marked, DOMPurify, highlightQuotes, display, displayRevision,
    {
      enabled: segmentedReading && (streaming || (!isLoading && index === latestAssistantIndex)),
      pageIndex: segmented.pageIndex
    }
  );
  const renderedMessages = ChatPanelMessageRenderers.renderMessages(
    React, messages, isLoading, typewriter, currentThinking, showStreamThinking, renderUser, renderAssistant,
    (last, loading) => ChatPanelMessageRenderers.renderRetryBtn(React, last, loading, handleRetry),
    MessageCollapseRenderer, scroll.isHistoryExpanded, scroll.expandHistory, modelConfig, editUserMessage
  );

  return <div className="chat-panel" data-gc-part="chat-panel"
    ref={chatPanelRef} onClick={segmented.advanceVisiblePage}>
    <GameCardStyleHost card={runtime.activeCard} />
    <BackgroundRuntime backgroundRequest={presentation.backgroundRequest} portraitRequest={presentation.portraitRequest} onBackgroundChange={onBackgroundChange} onPortraitChange={onPortraitChange} onVisualPanelChange={onVisualPanelChange} />
    <GameCardUIRoot card={runtime.activeCard} gameState={runtime.gameState}
      setGameState={runtime.setGameState} messages={messages} isLoading={isLoading}
      canRetry={Boolean(editUserMessage.retrySource && modelConfig?.apiUrl && modelConfig?.apiKey)}
      retrySource={editUserMessage.retrySource} onRetry={handleRetry}
      uiScopeKey={session.revision} onError={runtime.setRuntimeError} />
    <div className="chat-main" data-gc-part="chat-main">
      <div className="chat-header-hover-trigger" data-gc-part="chat-header-trigger" onMouseEnter={() => setIsHeaderHovered(true)} onMouseLeave={() => setIsHeaderHovered(false)} />
      <div className={`chat-header chat-header-clickable${isHeaderHovered ? ' chat-header-visible' : ''}`} data-gc-part="chat-header" onClick={toggleHistory} onMouseEnter={() => setIsHeaderHovered(true)} onMouseLeave={() => setIsHeaderHovered(false)}>
        {showMsgHistory ? <><span className="material-icons">history</span><span className="header-title">msg历史记录</span></> : <GameCardTitleControl
          modelName={modelConfig?.apiUrl ? (modelConfig.modelName || '已连接') : ''}
          onBeforeSessionChange={session.saveCurrent}
          onSessionChanged={session.reload}
          onSwitchSession={session.switchSession}
          onActiveCardChanged={handleCardChanged}
          onImportError={setActionError}
          audioControl={<BgmPlayer updateRequest={presentation.bgmRequest} stopToken={presentation.bgmStopToken} />}
        />}
      </div>
      {actionError ? <GameCardErrorPanel error={actionError} variant="import" onClose={() => setActionError(null)} /> : null}
      <div className="chat-history" data-gc-part="chat-history" ref={scroll.chatHistoryRef}>
        <div className="chat-reading-veil game-card-visual-panel" data-gc-part="chat-reading-veil" aria-hidden="true" />
        {runtime.runtimeError ? <GameCardErrorPanel error={runtime.runtimeError} /> : null}
        {showMsgHistory ? ChatPanelRenderers.renderMsgHistoryDisplay(React, msgHistoryMessages) : renderedMessages}
      </div>
      <div className="chat-input-hover-trigger" data-gc-part="chat-input-trigger" onMouseEnter={() => setIsInputTriggerHovered(true)} onMouseLeave={() => setIsInputTriggerHovered(false)} />
    </div>
    <ChatInputArea isLoading={isLoading} isInputHovered={isInputHovered} setIsInputHovered={setIsInputHovered} isInputTriggerHovered={isInputTriggerHovered} setIsInputTriggerHovered={setIsInputTriggerHovered} onSend={generation.send} onStop={generation.stop} />
  </div>;
}

ChatRuntime.propTypes = {
  BgmPlayer: PropTypes.elementType,
  BackgroundRuntime: PropTypes.elementType,
  onBackgroundChange: PropTypes.func,
  onPortraitChange: PropTypes.func,
  onVisualPanelChange: PropTypes.func
};

export default ChatRuntime;
