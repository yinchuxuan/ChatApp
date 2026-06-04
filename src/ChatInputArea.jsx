// ChatInputArea Component - Extracted from ChatPanel
// Encapsulates input textarea, send button, and submission logic

function ChatInputArea({
  messages,
  setMessages,
  gameState = {},
  setGameState,
  modelConfig,
  isLoading,
  setIsLoading,
  tw,
  setShowStreamThinking,
  isInputHovered,
  setIsInputHovered,
  isInputTriggerHovered,
  setIsInputTriggerHovered,
  retryBaseRef,
  retryBaseStateRef,
  onAudioSubmit,
  onAudioResponseComplete
}) {
  const R = window.React || React;
  const [inputValue, setInputValue] = R.useState('');
  const [isFocused, setIsFocused] = R.useState(false);
  const isVisible = isInputHovered || isFocused || inputValue.length > 0 || isInputTriggerHovered;
  const clone = (value) => typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    if (!modelConfig || !modelConfig.apiUrl || !modelConfig.apiKey) {
      setMessages(prev => [...prev, { role: 'user', content: inputValue }, { role: 'assistant', content: '请先在右侧设置面板配置模型 API', isError: true }]);
      setInputValue(''); setIsInputHovered(false); setIsInputTriggerHovered(false); return;
    }
    onAudioSubmit?.();
    const userMessage = { role: 'user', content: inputValue };
    const newMessages = [...messages, userMessage];
    if (retryBaseRef) {
      retryBaseRef.current = clone(newMessages);
    }
    if (retryBaseStateRef) retryBaseStateRef.current = clone(gameState);
    setMessages(newMessages); setInputValue(''); setIsInputHovered(false); setIsInputTriggerHovered(false); setIsLoading(true);
    const textarea = e.currentTarget.querySelector('textarea');
    if (textarea) textarea.blur();
    tw.startStreaming(); setShowStreamThinking(true);
    try {
      const preparePreSend = window.preparePreSendMessages || (async ({ messages }) => ({ messages }));
      const toApiMessages = window.toGameCardApiMessages || ((msgs) => msgs.map(msg => ({ role: msg.role, content: msg.content })));
      const preSend = await preparePreSend({ messages: newMessages, state: gameState });
      if (preSend.error) {
        setIsLoading(false); tw.reset();
        setMessages(prev => [...prev, { role: 'assistant', content: `游戏卡错误: ${preSend.error}`, isError: true }]);
        return;
      }
      if (preSend.state && setGameState) setGameState(preSend.state);
      if (preSend.applied) {
        setMessages(preSend.messages);
      }
      await window.sendChatRequest(
        {
          apiUrl: modelConfig.apiUrl,
          apiKey: modelConfig.apiKey,
          modelName: modelConfig.modelName,
          protocol: modelConfig.protocol || 'openai',
          maxTokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
          topP: modelConfig.topP,
          frequencyPenalty: modelConfig.frequencyPenalty,
          presencePenalty: modelConfig.presencePenalty,
          messages: toApiMessages(preSend.messages)
        },
        {
          onToken: (text) => tw.pushContent(text),
          onThinkingToken: (text) => tw.pushContent(text, 'reasoning')
        }
      );
      setIsLoading(false); tw.finishStreaming();
      const content = tw.getAccumulatedContent();
      const savedThinking = tw.getThinkingContent();
      if (content) {
        const assistantMessage = { role: 'assistant', content, _thinking: savedThinking, thinking: savedThinking };
        const prepareAfterResponse = window.prepareAfterResponseMessages || (async ({ messages }) => ({ messages, applied: false }));
        const baseMessages = preSend.applied ? preSend.messages : newMessages;
        const messagesWithAssistant = [...baseMessages, assistantMessage];
        const afterResponse = await prepareAfterResponse({
          messages: messagesWithAssistant,
          state: preSend.state || gameState,
          card: preSend.card || null
        });
        if (afterResponse.state && setGameState) setGameState(afterResponse.state);
        if (afterResponse.applied) {
          setMessages(afterResponse.messages);
        } else {
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
      onAudioResponseComplete?.();
      tw.clearStreaming();
    } catch (err) {
      setIsLoading(false); tw.reset();
      setMessages(prev => [...prev, { role: 'assistant', content: `请求失败: ${err.message}`, isError: true }]);
    }
  };

  const C = R.createElement;

  return C('form', {
    className: `chat-input-area${isVisible ? ' chat-input-area-visible' : ''}`,
    onSubmit: handleSubmit,
    onMouseEnter: () => setIsInputHovered(true),
    onMouseLeave: () => setIsInputHovered(false)
  },
    C('textarea', {
      className: 'chat-input-textarea',
      value: inputValue,
      onChange: (e) => setInputValue(e.target.value),
      placeholder: '输入您的回答...',
      disabled: isLoading,
      rows: 1,
      onFocus: () => setIsFocused(true),
      onBlur: () => setIsFocused(false),
      onKeyDown: (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.target.form.requestSubmit();
        }
      }
    }),
    C('button', {
      type: 'submit',
      className: 'md-btn md-btn-icon send-icon-btn',
      disabled: !inputValue.trim() || isLoading,
      'aria-label': '发送消息',
      title: '发送消息'
    },
      isLoading ? C('span', { className: 'material-icons rotating' }, 'refresh') : C('span', { className: 'material-icons' }, 'send')
    )
  );
}

if (typeof window !== 'undefined') { window.ChatInputArea = ChatInputArea; }
export default ChatInputArea;
