import './ChatInputArea.jsx';
// highlightQuotes exposes itself on window.highlightQuotes
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
    }, 100);
    const timeout = setTimeout(() => clearInterval(checkInterval), 5000);
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
      if (divider) view.scrollTop = Math.max(0, divider.offsetTop - 80);
    }
  }, [isHistoryExpanded]);

  const handleExpandHistory = () => { setIsHistoryExpanded(true); };

  const C = R.createElement;

  const renderMarkdown = (text) => {
    const rawHtml = window.marked ? window.marked.parse(text) : text;
    const sanitizedHtml = window.DOMPurify ? window.DOMPurify.sanitize(rawHtml) : rawHtml;
    const html = window.highlightQuotes(sanitizedHtml);
    return C('div', { className: 'chat-message-bubble' },
      C('div', { className: 'chat-bubble-content', dangerouslySetInnerHTML: { __html: html } })
    );
  };

  const renderAssistantMsg = (msg, idx, isStreaming) => {
    const thinking = isStreaming ? currentThinking : msg._thinking;
    const showThinking = isStreaming ? showStreamThinking : (msg._thinkingVisible === true);
    const rawContent = isStreaming ? msg.slice(0, tw.displayedCount) : msg.content;
    const rawHtml = window.marked ? window.marked.parse(rawContent) : rawContent;
    const sanitizedHtml = window.DOMPurify ? window.DOMPurify.sanitize(rawHtml) : rawHtml;
    const html = window.highlightQuotes(sanitizedHtml);
    const bubbleClass = thinking ? 'chat-message-bubble bubble-clickable' : 'chat-message-bubble';
    const handleClick = thinking ? () => {
      if (isStreaming) { setShowStreamThinking(p => !p); }
      else { toggleThinkingForMessage(idx); }
    } : null;
    return R.createElement('div', { className: bubbleClass, onClick: handleClick },
      thinking && showThinking && R.createElement('div', { className: 'chat-thinking-text' }, thinking),
      R.createElement('div', { className: 'chat-bubble-content', dangerouslySetInnerHTML: { __html: html } })
    );
  };

  const renderRetryBtn = (isLast, isLoading) => {
    if (!isLast || isLoading) return null;
    return C('button', {
      className: 'md-btn retry-btn', onClick: (e) => { e.stopPropagation(); handleRetry(); },
      title: '重新生成', 'aria-label': '重新生成回复'
    }, C('span', { className: 'material-icons' }, 'refresh'));
  };

  const streamThinking = tw.getThinkingContent();
  const hasThinking = isLoading && streamThinking && streamThinking.length > 0;
  const currentThinking = hasThinking ? streamThinking : null;

  const renderMessages = () => {
    if (messages.length === 0 && !isLoading) {
      if (!modelConfig?.apiUrl) {
        return C('div', { className: 'chat-empty' },
          C('span', { className: 'material-icons empty-icon' }, 'question_answer'),
          C('div', null, '开始对话'),
          C('div', { className: 'chat-empty-hint' }, '请先配置模型 API')
        );
      }
      return C('div', { className: 'chat-empty' },
        C('span', { className: 'material-icons empty-icon' }, 'question_answer'),
        C('div', null, '开始对话')
      );
    }
    if (collapseRenderer) {
      return collapseRenderer.render(R, messages, isLoading, tw, renderMarkdown, renderAssistantMsg, renderRetryBtn, isHistoryExpanded, handleExpandHistory);
    }
    const lastAssistantIdx = messages.map((m, i) => m.role === 'assistant' ? i : -1).filter(i => i >= 0).pop();
    return R.createElement(R.Fragment, null,
      messages.map((msg, idx) => {
        const isLast = idx === lastAssistantIdx;
        if (msg.role === 'assistant') {
          return C('div', { key: idx, className: 'chat-message-row' },
            C('div', { className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}`, style: { flex: 1, minWidth: 0 } },
              msg._thinking ? renderAssistantMsg(msg, idx, false) : renderMarkdown(msg.content)
            ),
            renderRetryBtn(isLast, isLoading)
          );
        }
        return C('div', { key: idx, className: 'chat-message-row' },
          C('div', { className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}`, style: { flex: 1, minWidth: 0 } },
            renderMarkdown(msg.content)
          )
        );
      }),
      isLoading && C('div', { className: 'chat-message assistant' }, renderAssistantMsg(tw.streamContent, messages.length, true))
    );
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
