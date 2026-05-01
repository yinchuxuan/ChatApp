import './ChatInputArea.jsx';

// ChatPanel Component
function ChatPanel() {
  const R = window.React || React;
  const InputArea = window.ChatInputArea;
  const [messages, setMessages] = R.useState([]);
  const [isLoading, setIsLoading] = R.useState(false);
  const [modelConfig, setModelConfig] = R.useState(null);
  const [showApiRequest, setShowApiRequest] = R.useState(false);
  const [lastApiRequestMessages, setLastApiRequestMessages] = R.useState(null);
  const [lastApiRequestProtocol, setLastApiRequestProtocol] = R.useState(null);
  const [renderersReady, setRenderersReady] = R.useState(false);
  const [showStreamThinking, setShowStreamThinking] = R.useState(true);
  const [isHeaderHovered, setIsHeaderHovered] = R.useState(false);
  const tw = window.useTypewriter(R);

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

  const handleToggleShowApiRequest = () => setShowApiRequest(p => !p);

  const handleClearHistory = (e) => { e.stopPropagation(); setMessages([]); tw.clearStreaming(); };

  const toggleThinkingForMessage = (idx) => {
    setMessages(prev => prev.map((msg, i) =>
      i === idx ? { ...msg, _thinkingVisible: !msg._thinkingVisible } : msg
    ));
  };

  const renderers = window.ChatPanelRenderers;
  const renderApiRequestDisplay = (renderers && renderersReady) ? () => renderers.renderApiRequestDisplay(R, lastApiRequestMessages, lastApiRequestProtocol) : () => null;

  const chatHistoryRef = R.useRef(null);
  const initialLoadDone = R.useRef(false);

  // Load chat history from file on mount
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

  // Save chat history to file after model response completes
  R.useEffect(() => {
    if (!initialLoadDone.current) return;
    if (isLoading) return;
    if (window.electronAPI) {
      window.electronAPI.saveChatHistory(messages);
    }
  }, [messages, isLoading]);

  // Auto-scroll to bottom when messages change, during streaming, or when display toggles
  R.useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages, isLoading, tw.displayedCount, showApiRequest]);

  const C = R.createElement;

  // Thinking state: only use stream thinking during active loading
  const streamThinking = tw.getThinkingContent();
  const hasThinking = isLoading && streamThinking && streamThinking.length > 0;
  const currentThinking = hasThinking ? streamThinking : null;

  // Render a single assistant message bubble
  const renderAssistantMsg = (msg, idx, isStreaming) => {
    const thinking = isStreaming ? currentThinking : msg._thinking;
    const showThinking = isStreaming ? showStreamThinking : (msg._thinkingVisible === true);
    const classes = thinking
      ? 'chat-message-bubble md-card bubble-clickable'
      : 'chat-message-bubble md-card';

    const handleClick = thinking ? () => {
      if (isStreaming) {
        setShowStreamThinking(p => !p);
      } else {
        toggleThinkingForMessage(idx);
      }
    } : null;

    return C('div', { className: classes, onClick: handleClick },
      thinking && showThinking && R.createElement('div', { className: 'chat-thinking-text' }, thinking),
      isStreaming ? msg.slice(0, tw.displayedCount) : msg.content
    );
  };

  // Render messages
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

    return R.createElement(R.Fragment, null,
      messages.map((msg, idx) =>
        C('div', { key: idx, className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}` },
          C('div', { className: 'chat-avatar' },
            C('span', { className: 'material-icons' }, msg.role === 'user' ? 'person' : 'smart_toy')
          ),
          msg.role === 'assistant' && msg._thinking
            ? renderAssistantMsg(msg, idx, false)
            : C('div', { className: 'chat-message-bubble md-card' }, msg.content)
        )
      ),
      isLoading && C('div', { className: 'chat-message assistant' },
        C('div', { className: 'chat-avatar' }, C('span', { className: 'material-icons' }, 'smart_toy')),
        renderAssistantMsg(tw.streamContent, messages.length, true)
      )
    );
  };

  return C('div', { className: 'chat-panel' },
    C('div', { className: 'chat-header-hover-trigger', onMouseEnter: () => setIsHeaderHovered(true), onMouseLeave: () => setIsHeaderHovered(false) }),
    C('div', { className: 'chat-main' },
      C('div', { className: `chat-header chat-header-clickable${isHeaderHovered ? ' chat-header-visible' : ''}`, onClick: handleToggleShowApiRequest, onMouseEnter: () => setIsHeaderHovered(true), onMouseLeave: () => setIsHeaderHovered(false) },
        C('span', { className: 'material-icons' }, showApiRequest ? 'code' : 'chat'),
        C('span', { className: 'header-title' }, showApiRequest ? 'API请求' : '聊天'),
        modelConfig && modelConfig.apiUrl && C('span', { className: 'config-status configured' }, modelConfig.modelName || '已连接'),
        messages.length > 0 && C('button', {
          className: 'chat-header-clear-btn md-btn md-btn-icon',
          onClick: handleClearHistory,
          title: '清空聊天历史',
          'aria-label': '清空聊天历史'
        }, C('span', { className: 'material-icons' }, 'delete_sweep'))
      ),
      C('div', { className: 'chat-history', ref: chatHistoryRef },
        showApiRequest ? renderApiRequestDisplay() : renderMessages()
      )
    ),
    C(InputArea, {
      messages, setMessages,
      modelConfig,
      isLoading, setIsLoading,
      tw,
      setLastApiRequestMessages, setLastApiRequestProtocol,
      setShowStreamThinking
    })
  );
}

if (typeof window !== 'undefined') { window.ChatPanel = ChatPanel; }
export default ChatPanel;
