// ChatPanel Component
function ChatPanel() {
  const R = window.React || React;
  const [messages, setMessages] = R.useState([]);
  const [inputValue, setInputValue] = R.useState('');
  const [isLoading, setIsLoading] = R.useState(false);
  const [modelConfig, setModelConfig] = R.useState(null);
  const [showApiRequest, setShowApiRequest] = R.useState(false);
  const [lastApiRequestMessages, setLastApiRequestMessages] = R.useState(null);
  const [renderersReady, setRenderersReady] = R.useState(false);
  const [showStreamThinking, setShowStreamThinking] = R.useState(true);
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

  const handleToggleShowApiRequest = () => setShowApiRequest(p => !p);

  const toggleThinkingForMessage = (idx) => {
    setMessages(prev => prev.map((msg, i) =>
      i === idx ? { ...msg, _thinkingVisible: !msg._thinkingVisible } : msg
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    if (!modelConfig || !modelConfig.apiUrl || !modelConfig.apiKey) {
      setMessages(prev => [...prev, { role: 'user', content: inputValue }, { role: 'assistant', content: '请先在右侧设置面板配置模型 API', isError: true }]);
      setInputValue(''); return;
    }
    const userMessage = { role: 'user', content: inputValue };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages); setInputValue(''); setIsLoading(true);
    tw.startStreaming(); setShowStreamThinking(true);
    try {
      const apiMessages = newMessages.map(msg => ({ role: msg.role, content: msg.content }));
      setLastApiRequestMessages(apiMessages);
      const response = await fetch(`${modelConfig.apiUrl}/chat/completions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${modelConfig.apiKey}` },
        body: JSON.stringify({ model: modelConfig.modelName || 'gpt-3.5-turbo', messages: apiMessages, stream: true })
      });
      if (!response.ok) { const errorData = await response.json().catch(() => {}); throw new Error(errorData?.error?.message || `API 错误: ${response.status}`); }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim(); if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6); if (data === '[DONE]') continue;
          try { const parsed = JSON.parse(data); const choice = parsed.choices?.[0]?.delta; if (choice?.reasoning_content) tw.pushContent(choice.reasoning_content, 'reasoning'); if (choice?.content) tw.pushContent(choice.content); } catch { /* skip */ }
        }
      }
      setIsLoading(false); tw.finishStreaming();
      const content = tw.getAccumulatedContent();
      const savedThinking = tw.getThinkingContent();
      if (content) { setMessages(prev => [...prev, { role: 'assistant', content, _thinking: savedThinking }]); tw.clearStreaming(); }
    } catch (err) {
      setIsLoading(false); tw.reset();
      setMessages(prev => [...prev, { role: 'assistant', content: `请求失败: ${err.message}`, isError: true }]);
    }
  };

  const renderers = window.ChatPanelRenderers;
  const renderApiRequestDisplay = (renderers && renderersReady) ? () => renderers.renderApiRequestDisplay(R, lastApiRequestMessages) : () => null;

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
    C('div', { className: 'chat-main' },
      C('div', { className: 'chat-header chat-header-clickable', onClick: handleToggleShowApiRequest },
        C('span', { className: 'material-icons' }, showApiRequest ? 'code' : 'chat'),
        C('span', { className: 'header-title' }, showApiRequest ? 'API请求' : '聊天'),
        modelConfig && modelConfig.apiUrl && C('span', { className: 'config-status configured' }, modelConfig.modelName || '已连接')
      ),
      C('div', { className: 'chat-history' },
        showApiRequest ? renderApiRequestDisplay() : renderMessages()
      )
    ),
    C('form', { className: 'chat-input-area', onSubmit: handleSubmit },
      C('div', { className: 'md-input-container' },
        C('input', { type: 'text', className: 'md-input', value: inputValue, onChange: (e) => setInputValue(e.target.value), placeholder: '输入您的问题...', disabled: isLoading })
      ),
      C('button', { type: 'submit', className: 'md-btn md-btn-primary md-btn-contained', disabled: !inputValue.trim() || isLoading },
        isLoading ? C('span', { className: 'material-icons rotating' }, 'refresh') : C('span', { className: 'material-icons' }, 'send'),
        C('span', null, isLoading ? '发送中...' : '发送')
      )
    )
  );
}

if (typeof window !== 'undefined') { window.ChatPanel = ChatPanel; }
export default ChatPanel;
