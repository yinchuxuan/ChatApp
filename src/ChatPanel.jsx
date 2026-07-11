import DOMPurify from 'dompurify';
import { marked } from 'marked';
import React from 'react';
import ChatInputArea from './ChatInputArea.jsx';
import ChatPanelMessageRenderers from './components/ChatPanelMessageRenderers.js';
import ChatPanelRenderers from './components/ChatPanelRenderers.js';
import GameCardBackgroundRuntime from './components/GameCardBackgroundRuntime.js';
import GameCardBgmPlayer from './components/GameCardBgmPlayer.js';
import GameCardErrorPanel, { normalizeGameCardError } from './components/GameCardErrorPanel.jsx';
import GameCardTitleControl from './components/GameCardTitleControl.jsx';
import GameCardUIRoot from './components/GameCardUIRoot.jsx';
import MessageCollapseRenderer from './components/MessageCollapseRenderer.js';
import generationServices from './components/generationServices.js';
import { highlightQuotes } from './components/highlightQuotes.js';
import useGenerationAbort from './components/useGenerationAbort.js';
import useLastUserMessageEdit from './components/useLastUserMessageEdit.js';
import useRetry from './components/useRetry.js';
import useTypewriter from './components/useTypewriter.js';
import { loadGameCardDisplayStyle } from './gameCard/displayStyles.js';
import { loadGameCardUiStyle } from './gameCard/uiStyles.js';
import { loadGameCardVisualStyle } from './gameCard/visualStyles.js';
import { gameCardPlatform } from './platform/index.js';

function ChatPanel({ BgmPlayer = GameCardBgmPlayer, BackgroundRuntime = GameCardBackgroundRuntime } = {}) {
  const R = React;
  const [messages, setMessages] = R.useState([]), [gameState, setGameState] = R.useState({});
  const [isLoading, setIsLoading] = R.useState(false), [modelConfig, setModelConfig] = R.useState(null);
  const [activeGameCard, setActiveGameCard] = R.useState(null), [gameCardError, setGameCardError] = R.useState(null), [gameCardActionError, setGameCardActionError] = R.useState(null);
  const [showMsgHistory, setShowMsgHistory] = R.useState(false), [msgHistoryMessages, setMsgHistoryMessages] = R.useState(null);
  const [showStreamThinking, setShowStreamThinking] = R.useState(true);
  const [isHeaderHovered, setIsHeaderHovered] = R.useState(false), [isInputHovered, setIsInputHovered] = R.useState(false);
  const [isInputTriggerHovered, setIsInputTriggerHovered] = R.useState(false), [isHistoryExpanded, setIsHistoryExpanded] = R.useState(false);
  const [audioStopToken, setAudioStopToken] = R.useState(0), [streamContentStartToken, setStreamContentStartToken] = R.useState(0);
  const tw = useTypewriter(R);
  const handleStreamContentStart = R.useCallback(() => setStreamContentStartToken(value => value + 1), []);
  const retryBaseRef = R.useRef(null), retryBaseStateRef = R.useRef(null), generationControl = useGenerationAbort(R);
  const editUserMessage = useLastUserMessageEdit(R, messages, isLoading);
  const runRetry = useRetry(R, messages, setMessages, modelConfig, setIsLoading, tw, retryBaseRef, gameState, setGameState, retryBaseStateRef, handleStreamContentStart, generationControl);
  const handleRetry = R.useCallback(async () => { const ok = await runRetry(editUserMessage.isActive ? editUserMessage.content : undefined); if (ok) editUserMessage.finish(); }, [runRetry, editUserMessage]);
  R.useEffect(() => {
    async function loadInitialData() {
      if (!window.electronAPI) return;
      const [config, card] = await Promise.all([window.electronAPI.getModelConfig(), window.electronAPI.getActiveGameCard ? window.electronAPI.getActiveGameCard() : Promise.resolve(null)]);
      if (config.success) setModelConfig(config.config);
      if (card?.success) setActiveGameCard(card.card || null);
      else if (card?.error) setGameCardError(normalizeGameCardError(card));
    }
    loadInitialData();
  }, []);
  R.useEffect(() => {
    const handler = (e) => setModelConfig(e.detail);
    window.addEventListener('model-config-changed', handler);
    return () => window.removeEventListener('model-config-changed', handler);
  }, []);
  R.useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') setIsHistoryExpanded(false);
  }, [messages]);
  const handleToggleShowMsgHistory = () => {
    const newShow = !showMsgHistory;
    setShowMsgHistory(newShow);
    if (newShow && window.electronAPI) {
      window.electronAPI.getChatHistory().then(result => {
        if (result.success) setMsgHistoryMessages(result.messages);
      });
    }
  };
  const toggleThinkingForMessage = (idx) => {
    setMessages(prev => prev.map((msg, i) => i === idx ? { ...msg, _thinkingVisible: !msg._thinkingVisible } : msg));
  };
  const renderMsgHistoryDisplay = () => ChatPanelRenderers.renderMsgHistoryDisplay(R, msgHistoryMessages);
  const renderUserMarkdown = (text) => ChatPanelMessageRenderers.renderUserMsg(R, { content: text }, marked, DOMPurify, highlightQuotes, activeGameCard?.display);
  const renderAssistantMsg = (msg, idx, isStreaming) => ChatPanelMessageRenderers.renderAssistantMsg(R, msg, idx, isStreaming, tw, currentThinking, showStreamThinking, setShowStreamThinking, toggleThinkingForMessage, marked, DOMPurify, highlightQuotes, activeGameCard?.display);
  const renderRetryBtn = (isLast, isLoading) => ChatPanelMessageRenderers.renderRetryBtn(R, isLast, isLoading, handleRetry);
  const chatHistoryRef = R.useRef(null), initialLoadDone = R.useRef(false);
  const pinnedScrollAppliedRef = R.useRef(false), lastPinnedUserContentRef = R.useRef(null), wasLoadingRef = R.useRef(false);
  const loadHistory = R.useCallback(async () => {
    if (window.electronAPI) {
      const result = await window.electronAPI.getChatHistory();
      if (result.success && result.retryBaseMessages) retryBaseRef.current = result.retryBaseMessages;
      if (result.success && result.retryBaseState) retryBaseStateRef.current = result.retryBaseState;
      if (result.success) {
        const loaded = result.messages || [];
        const loadedState = result.gameState || {};
        const init = await generationServices.prepareInitMessages({ messages: loaded, state: loadedState });
        const nextMessages = init.changed ? init.messages : loaded;
        const nextState = init.state || loadedState;
        setGameCardError(init.error ? normalizeGameCardError(init) : null);
        setMessages(nextMessages);
        setGameState(nextState);
        if (init.changed) window.electronAPI.saveChatHistory(nextMessages, { gameState: nextState, retryBaseMessages: retryBaseRef.current, retryBaseState: retryBaseStateRef.current });
      }
    }
    initialLoadDone.current = true;
  }, []);

  R.useEffect(() => { loadHistory(); }, [loadHistory]);
  R.useEffect(() => { loadGameCardDisplayStyle(activeGameCard, gameCardPlatform.resources); loadGameCardVisualStyle(activeGameCard, gameCardPlatform.resources); loadGameCardUiStyle(activeGameCard, gameCardPlatform.resources); }, [activeGameCard]);
  const saveCurrentSession = R.useCallback(async () => { if (window.electronAPI && !isLoading) await window.electronAPI.saveChatHistory(messages, { gameState, retryBaseMessages: retryBaseRef.current, retryBaseState: retryBaseStateRef.current }); }, [messages, gameState, isLoading]);
  const handleSessionChanged = R.useCallback(async () => { retryBaseRef.current = null; retryBaseStateRef.current = null; tw.clearStreaming(); setIsHistoryExpanded(false); await loadHistory(); }, [loadHistory, tw]);

  R.useEffect(() => {
    const handler = async (e) => {
      retryBaseRef.current = null; retryBaseStateRef.current = null; tw.clearStreaming();
      setGameCardError(null);
      if (e.detail !== undefined) setActiveGameCard(e.detail || null);
      else if (window.electronAPI?.getActiveGameCard) { const card = await window.electronAPI.getActiveGameCard(); if (card.success) setActiveGameCard(card.card || null); else setGameCardError(normalizeGameCardError(card)); }
      loadHistory();
    };
    window.addEventListener('game-card-changed', handler);
    return () => window.removeEventListener('game-card-changed', handler);
  }, [loadHistory, tw]);
  R.useEffect(() => {
    if (!initialLoadDone.current) return;
    if (isLoading) return;
    if (window.electronAPI) {
      window.electronAPI.saveChatHistory(messages, { gameState, retryBaseMessages: retryBaseRef.current, retryBaseState: retryBaseStateRef.current });
    }
  }, [messages, gameState, isLoading]);

  const SCROLL_DIVIDER_OFFSET = 80;
  R.useEffect(() => {
    const justFinishedStreaming = wasLoadingRef.current && !isLoading;
    wasLoadingRef.current = isLoading;
    if (chatHistoryRef.current && !isHistoryExpanded) {
      const collapsedView = chatHistoryRef.current.querySelector('.collapsed-message-view');
      if (collapsedView) {
        if (justFinishedStreaming) return;
        const pinnedUser = collapsedView.querySelector('.retry-source-row .chat-message.user');
        const pinnedUserContent = pinnedUser ? pinnedUser.textContent : null;
        const shouldPin = pinnedUserContent && (!pinnedScrollAppliedRef.current || lastPinnedUserContentRef.current !== pinnedUserContent);
        if (shouldPin) {
          collapsedView.scrollTop = 0;
          chatHistoryRef.current.scrollTop = 0;
          pinnedScrollAppliedRef.current = true;
          lastPinnedUserContentRef.current = pinnedUserContent;
        }
        return;
      }
      pinnedScrollAppliedRef.current = false; lastPinnedUserContentRef.current = null;
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, isLoading, tw.displayedCount, showMsgHistory]);

  R.useEffect(() => {
    if (!chatHistoryRef.current || !isHistoryExpanded) return;
    const view = chatHistoryRef.current.querySelector('.collapsed-message-view');
    if (view) {
      const divider = view.querySelector('.pinned-divider');
      if (divider) view.scrollTop = Math.max(0, divider.offsetTop - SCROLL_DIVIDER_OFFSET);
    }
  }, [isHistoryExpanded]);

  const handleExpandHistory = () => { setIsHistoryExpanded(true); };
  const handleAudioSubmit = R.useCallback(() => setAudioStopToken(value => value + 1), []);

  const C = R.createElement;
  const streamThinking = tw.getThinkingContent(), hasThinking = isLoading && streamThinking && streamThinking.length > 0;
  const currentThinking = hasThinking ? streamThinking : null;

  const renderMessages = () => {
    return ChatPanelMessageRenderers.renderMessages(R, messages, isLoading, tw, currentThinking, showStreamThinking, renderUserMarkdown, renderAssistantMsg, renderRetryBtn, MessageCollapseRenderer, isHistoryExpanded, handleExpandHistory, modelConfig, editUserMessage);
  };

  return C('div', { className: 'chat-panel', 'data-gc-part': 'chat-panel' },
    C(BackgroundRuntime, { card: activeGameCard, gameState, defer: isLoading, revealToken: streamContentStartToken }),
    C(GameCardUIRoot, { card: activeGameCard, gameState, setGameState, messages, isLoading }),
    C('div', { className: 'chat-main', 'data-gc-part': 'chat-main' },
      C('div', { className: 'chat-header-hover-trigger', 'data-gc-part': 'chat-header-trigger', onMouseEnter: () => setIsHeaderHovered(true), onMouseLeave: () => setIsHeaderHovered(false) }),
      C('div', { className: `chat-header chat-header-clickable${isHeaderHovered ? ' chat-header-visible' : ''}`, 'data-gc-part': 'chat-header', onClick: handleToggleShowMsgHistory, onMouseEnter: () => setIsHeaderHovered(true), onMouseLeave: () => setIsHeaderHovered(false) },
        showMsgHistory ? C('span', { className: 'material-icons' }, 'history') : null,
        showMsgHistory ? C('span', { className: 'header-title' }, 'msg历史记录') : C(GameCardTitleControl, {
          modelName: modelConfig && modelConfig.apiUrl ? (modelConfig.modelName || '已连接') : '',
          onBeforeSessionChange: saveCurrentSession,
          onSessionChanged: handleSessionChanged,
          onImportError: setGameCardActionError,
          audioControl: C(BgmPlayer, { card: activeGameCard, gameState, stopToken: audioStopToken, resumeToken: streamContentStartToken, defer: isLoading })
        })
      ),
      gameCardActionError ? C(GameCardErrorPanel, { error: gameCardActionError, variant: 'import', onClose: () => setGameCardActionError(null) }) : null,
      C('div', { className: 'chat-history', 'data-gc-part': 'chat-history', ref: chatHistoryRef },
        C('div', { className: 'chat-reading-veil game-card-visual-panel', 'data-gc-part': 'chat-reading-veil', 'aria-hidden': 'true' }),
        gameCardError ? C(GameCardErrorPanel, { error: gameCardError }) : null,
        showMsgHistory ? renderMsgHistoryDisplay() : renderMessages()
      ),
      C('div', { className: 'chat-input-hover-trigger', 'data-gc-part': 'chat-input-trigger', onMouseEnter: () => setIsInputTriggerHovered(true), onMouseLeave: () => setIsInputTriggerHovered(false) })
    ),
    C(ChatInputArea, {
      messages, setMessages, gameState, setGameState, modelConfig, isLoading, setIsLoading, tw,
      setShowStreamThinking, isInputHovered, setIsInputHovered, isInputTriggerHovered, setIsInputTriggerHovered,
      retryBaseRef, retryBaseStateRef, onAudioSubmit: handleAudioSubmit, onStreamContentStart: handleStreamContentStart,
      onGameCardError: setGameCardError, generationControl
    })
  );
}

export default ChatPanel;
