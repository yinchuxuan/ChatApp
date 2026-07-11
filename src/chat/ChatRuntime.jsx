import DOMPurify from 'dompurify';
import { marked } from 'marked';
import React from 'react';
import ChatInputArea from '../ChatInputArea.jsx';
import ChatPanelMessageRenderers from '../components/ChatPanelMessageRenderers.js';
import ChatPanelRenderers from '../components/ChatPanelRenderers.js';
import GameCardBackgroundRuntime from '../components/GameCardBackgroundRuntime.js';
import GameCardBgmPlayer from '../components/GameCardBgmPlayer.js';
import GameCardErrorPanel from '../components/GameCardErrorPanel.jsx';
import GameCardTitleControl from '../components/GameCardTitleControl.jsx';
import GameCardUIRoot from '../components/GameCardUIRoot.jsx';
import MessageCollapseRenderer from '../components/MessageCollapseRenderer.jsx';
import { highlightQuotes } from '../components/highlightQuotes.js';
import useLastUserMessageEdit from './useLastUserMessageEdit.js';
import useTypewriter from './useTypewriter.js';
import { loadGameCardDisplayStyle } from '../gameCard/displayStyles.js';
import { loadGameCardUiStyle } from '../gameCard/uiStyles.js';
import { loadGameCardVisualStyle } from '../gameCard/visualStyles.js';
import { gameCardPlatform, rendererServices } from '../platform/index.js';
import { useGameCardRuntime } from './GameCardRuntimeProvider.jsx';
import useChatGeneration from './useChatGeneration.js';
import useChatPersistence from './useChatPersistence.js';
import useChatScroll from './useChatScroll.js';
import useChatSession from './useChatSession.js';
import useModelConfig from './useModelConfig.js';

function ChatRuntime({
  BgmPlayer = GameCardBgmPlayer,
  BackgroundRuntime = GameCardBackgroundRuntime,
  onBackgroundChange,
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
  const [audioStopToken, setAudioStopToken] = React.useState(0);
  const [streamStartToken, setStreamStartToken] = React.useState(0);
  const runtime = useGameCardRuntime();
  const modelConfig = useModelConfig();
  const typewriter = useTypewriter(React);
  const persistence = useChatPersistence({ messages, gameState: runtime.gameState, isLoading });
  const handleAudioSubmit = React.useCallback(() => setAudioStopToken(value => value + 1), []);
  const handleStreamStart = React.useCallback(() => setStreamStartToken(value => value + 1), []);
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
    onAudioSubmit: handleAudioSubmit,
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
    onResetView: scroll.collapseHistory
  });
  const editUserMessage = useLastUserMessageEdit(React, messages, isLoading);

  React.useEffect(() => {
    loadGameCardDisplayStyle(runtime.activeCard, gameCardPlatform.resources);
    loadGameCardVisualStyle(runtime.activeCard, gameCardPlatform.resources);
    loadGameCardUiStyle(runtime.activeCard, gameCardPlatform.resources);
  }, [runtime.activeCard]);

  const handleRetry = React.useCallback(async () => {
    const ok = await generation.retry(editUserMessage.isActive ? editUserMessage.content : undefined);
    if (ok) editUserMessage.finish();
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
  const renderUser = text => ChatPanelMessageRenderers.renderUserMsg(
    React, { content: text }, marked, DOMPurify, highlightQuotes, runtime.activeCard?.display
  );
  const renderAssistant = (msg, index, streaming) => ChatPanelMessageRenderers.renderAssistantMsg(
    React, msg, index, streaming, typewriter, currentThinking, showStreamThinking,
    setShowStreamThinking, toggleThinking, marked, DOMPurify, highlightQuotes, runtime.activeCard?.display
  );
  const renderedMessages = ChatPanelMessageRenderers.renderMessages(
    React, messages, isLoading, typewriter, currentThinking, showStreamThinking, renderUser, renderAssistant,
    (last, loading) => ChatPanelMessageRenderers.renderRetryBtn(React, last, loading, handleRetry),
    MessageCollapseRenderer, scroll.isHistoryExpanded, scroll.expandHistory, modelConfig, editUserMessage
  );

  return <div className="chat-panel" data-gc-part="chat-panel">
    <BackgroundRuntime card={runtime.activeCard} gameState={runtime.gameState} defer={isLoading} revealToken={streamStartToken} onBackgroundChange={onBackgroundChange} onVisualPanelChange={onVisualPanelChange} />
    <GameCardUIRoot card={runtime.activeCard} gameState={runtime.gameState} setGameState={runtime.setGameState} messages={messages} isLoading={isLoading} onError={runtime.setRuntimeError} />
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
          audioControl={<BgmPlayer card={runtime.activeCard} gameState={runtime.gameState} stopToken={audioStopToken} resumeToken={streamStartToken} defer={isLoading} />}
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

export default ChatRuntime;
