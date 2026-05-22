import './ChatInputArea.jsx';
import './components/ChatPanelMessageRenderers.js';
// highlightQuotes exposes itself on window.highlightQuotes

const RENDERER_POLL_INTERVAL = 100;
const RENDERER_POLL_TIMEOUT = 5000;

// ChatPanel Component
function ChatPanel() {
  const R = window.React || React;
  const InputArea = window.ChatInputArea;
  const [messages, setMessages] = R.useState([]);
  const [isLoading, setIsLoading] = R.useState(false);
  const [modelConfig, setModelConfig] = R.useState(null);
  const [showMsgHistory, setShowMsgHistory] = R.useState(false);
  const [msgHistoryMessages, setMsgHistoryMessages] = R.useState(null);
  const [renderersReady, setRenderersReady] = R.useState(false);
  const [showStreamThinking, setShowStreamThinking] = R.useState(true);
  const [isHeaderHovered, setIsHeaderHovered] = R.useState(false);
  const [isInputHovered, setIsInputHovered] = R.useState(false);
  const [isInputTriggerHovered, setIsInputTriggerHovered] = R.useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = R.useState(false);
  const tw = window.useTypewriter(R);
  const handleRetry = window.useRetry(R, messages, setMessages, modelConfig, setIsLoading, tw);

  R.useEffect(() => {
    if (window.ChatPanelRenderers) { setRenderersReady(true); return; }
    const checkInterval = setInterval(() => {
      if (window.ChatPanelRenderers) { setRenderersReady(true); clearInterval(checkInterval); }
    }, RENDERER_POLL_INTERVAL);
    const timeout = setTimeout(() => clearInterval(checkInterval), RENDERER_POLL_TIMEOUT);
    return () => { clearInterval(checkInterval); clearTimeout(timeout); };
  }, []);

  R.useEffect(() => {
    async function loadConfig() {
      if (window.electronAPI) { const result = await window.electronAPI.getModelConfig(); if (result.success) setModelConfig(result.config); }
    }
    loadConfig();
  }, []);

  R.useEffect(() => {
    const handler = (e) => setModelConfig(e.detail);
    window.addEventListener('model-config-changed', handler);
    return () => window.removeEventListener('model-config-changed', handler);
  }, []);

  R.useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
      setIsHistoryExpanded(false);
    }
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

  const handleClearHistory = (e) => { e.stopPropagation(); setMessages([]); tw.clearStreaming(); setIsHistoryExpanded(false); };

  const toggleThinkingForMessage = (idx) => {
    setMessages(prev => prev.map((msg, i) =>
      i === idx ? { ...msg, _thinkingVisible: !msg._thinkingVisible } : msg
    ));
  };

  const renderers = window.ChatPanelRenderers;
  const collapseRenderer = window.MessageCollapseRenderer;
  const renderMsgHistoryDisplay = (renderers && renderersReady) ? () => renderers.renderMsgHistoryDisplay(R, msgHistoryMessages) : () => null;
  const msgRenderers = window.ChatPanelMessageRenderers;
  const renderMarkdown = msgRenderers ? (text) => msgRenderers.renderMarkdown(R, text, window.marked, window.DOMPurify, window.highlightQuotes) : null;
  const renderAssistantMsg = msgRenderers ? (msg, idx, isStreaming) => msgRenderers.renderAssistantMsg(R, msg, idx, isStreaming, tw, currentThinking, showStreamThinking, setShowStreamThinking, toggleThinkingForMessage, window.marked, window.DOMPurify, window.highlightQuotes) : null;
  const renderRetryBtn = msgRenderers ? (isLast, isLoading) => msgRenderers.renderRetryBtn(R, isLast, isLoading, handleRetry) : null;

  const chatHistoryRef = R.useRef(null);
  const initialLoadDone = R.useRef(false);

  R.useEffect(() => {
    async function loadHistory() {
      if (window.electronAPI) {
        const result = await window.electronAPI.getChatHistory();
        if (result.success && result.messages && result.messages.length > 0) {
          setMessages(result.messages);
        }
      }
      initialLoadDone.current = true;
    }
    loadHistory();
  }, []);

  R.useEffect(() => {
    if (!initialLoadDone.current) return;
    if (isLoading) return;
    if (window.electronAPI) {
      window.electronAPI.saveChatHistory(messages);
    }
  }, [messages, isLoading]);

  const SCROLL_DIVIDER_OFFSET = 80;

  R.useEffect(() => {
    if (chatHistoryRef.current && !isHistoryExpanded) {
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

  const C = R.createElement;

  const streamThinking = tw.getThinkingContent();
  const hasThinking = isLoading && streamThinking && streamThinking.length > 0;
  const currentThinking = hasThinking ? streamThinking : null;

  const renderMessages = () => {
    if (msgRenderers && renderMarkdown && renderAssistantMsg && renderRetryBtn) {
      return msgRenderers.renderMessages(R, messages, isLoading, tw, currentThinking, showStreamThinking, renderMarkdown, renderAssistantMsg, renderRetryBtn, collapseRenderer, isHistoryExpanded, handleExpandHistory, modelConfig);
    }
    // Fallback: renderers not loaded
    if (messages.length === 0) return C('div', { className: 'chat-empty' }, C('div', null, '加载中...'));
    return C('div', null, messages.map((msg, idx) => C('div', { key: idx }, msg.content)));
  };

  return C('div', { className: 'chat-panel' },
    C('div', { className: 'chat-header-hover-trigger', onMouseEnter: () => setIsHeaderHovered(true), onMouseLeave: () => setIsHeaderHovered(false) }),
    C('div', { className: 'chat-main' },
      C('div', { className: `chat-header chat-header-clickable${isHeaderHovered ? ' chat-header-visible' : ''}`, onClick: handleToggleShowMsgHistory, onMouseEnter: () => setIsHeaderHovered(true), onMouseLeave: () => setIsHeaderHovered(false) },
        C('span', { className: 'material-icons' }, showMsgHistory ? 'history' : 'chat'),
        C('span', { className: 'header-title' }, showMsgHistory ? 'msg历史记录' : '聊天'),
        modelConfig && modelConfig.apiUrl && C('span', { className: 'config-status configured' }, modelConfig.modelName || '已连接'),
        messages.length > 0 && C('button', {
          className: 'chat-header-clear-btn md-btn md-btn-icon',
          onClick: handleClearHistory, title: '清空聊天历史', 'aria-label': '清空聊天历史'
        }, C('span', { className: 'material-icons' }, 'delete_sweep'))
      ),
      C('div', { className: 'chat-history', ref: chatHistoryRef },
        showMsgHistory ? renderMsgHistoryDisplay() : renderMessages()
      ),
      C('div', { className: 'chat-input-hover-trigger', onMouseEnter: () => setIsInputTriggerHovered(true), onMouseLeave: () => setIsInputTriggerHovered(false) })
    ),
    C(InputArea, {
      messages, setMessages, modelConfig, isLoading, setIsLoading, tw,
      setShowStreamThinking, isInputHovered, setIsInputHovered, isInputTriggerHovered, setIsInputTriggerHovered
    })
  );
}

if (typeof window !== 'undefined') { window.ChatPanel = ChatPanel; }
export default ChatPanel;
