import React from 'react';
import * as chatGeneration from './components/chatGeneration.js';

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
  onStreamContentStart,
  onGameCardError,
  generationControl
}) {
  const R = React;
  const [inputValue, setInputValue] = R.useState('');
  const [isFocused, setIsFocused] = R.useState(false);
  const formRef = R.useRef(null), textareaRef = R.useRef(null);
  const isVisible = isLoading || isInputHovered || isFocused || inputValue.length > 0 || isInputTriggerHovered;
  const focusInput = R.useCallback(() => {
    setIsInputHovered(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, [setIsInputHovered]);

  const submitValue = R.useCallback(async (rawValue, formElement) => {
    const value = String(rawValue || '');
    if (!value.trim() || isLoading) return;
    if (!modelConfig || !modelConfig.apiUrl || !modelConfig.apiKey) {
      setMessages(prev => [...prev, { role: 'user', content: value }, { role: 'assistant', content: '请先在右侧设置面板配置模型 API', isError: true }]);
      setInputValue(''); setIsInputHovered(false); setIsInputTriggerHovered(false); return;
    }
    onAudioSubmit?.();
    const userMessage = { role: 'user', content: value };
    const newMessages = [...messages, userMessage];
    if (retryBaseRef) retryBaseRef.current = chatGeneration.normalizeRetryMessages(newMessages);
    if (retryBaseStateRef) retryBaseStateRef.current = chatGeneration.cloneChatValue(gameState);
    setInputValue(''); setIsInputHovered(false); setIsInputTriggerHovered(false);
    const textarea = formElement?.querySelector('textarea') || textareaRef.current;
    if (textarea) textarea.blur();
    await chatGeneration.runChatGeneration({
      messages: newMessages,
      state: gameState,
      modelConfig,
      setMessages,
      setGameState,
      setIsLoading,
      tw,
      setShowStreamThinking,
      onStreamContentStart,
      onGameCardError,
      ...generationControl,
      appendAssistantWithUpdater: true
    });
  }, [chatGeneration, gameState, isLoading, messages, modelConfig, retryBaseRef, retryBaseStateRef, setGameState,
    setIsInputHovered, setIsInputTriggerHovered, setIsLoading, setMessages, setShowStreamThinking,
    tw, onAudioSubmit, onStreamContentStart, onGameCardError, generationControl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) { generationControl?.stopGeneration?.(); return; }
    await submitValue(inputValue, e.currentTarget);
  };

  R.useEffect(() => {
    const handler = (e) => {
      const action = e.detail || {};
      if (action.type === 'chat.input.set') {
        setInputValue(String(action.value || ''));
        if (action.focus) focusInput();
      } else if (action.type === 'chat.input.append') {
        setInputValue(prev => prev + String(action.value || ''));
        if (action.focus) focusInput();
      } else if (action.type === 'chat.input.clear') {
        setInputValue('');
      } else if (action.type === 'chat.input.focus') {
        focusInput();
      } else if (action.type === 'chat.input.submit') {
        formRef.current?.requestSubmit();
      } else if (action.type === 'chat.send') {
        submitValue(action.content, formRef.current);
      }
    };
    window.addEventListener('game-card-chat-input-action', handler);
    return () => window.removeEventListener('game-card-chat-input-action', handler);
  }, [focusInput, submitValue]);

  const C = R.createElement;

  return C('form', {
    className: `chat-input-area${isVisible ? ' chat-input-area-visible' : ''}`,
    'data-gc-part': 'chat-input',
    ref: formRef,
    onSubmit: handleSubmit,
    onMouseEnter: () => setIsInputHovered(true),
    onMouseLeave: () => setIsInputHovered(false)
  },
    C('textarea', {
      className: 'chat-input-textarea',
      'data-gc-part': 'chat-input-textarea',
      ref: textareaRef,
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
      'data-gc-part': 'chat-send-button',
      disabled: isLoading ? false : !inputValue.trim(),
      'aria-label': isLoading ? '停止生成' : '发送消息',
      title: isLoading ? '停止生成' : '发送消息'
    },
      isLoading ? C('span', { className: 'material-icons' }, 'stop') : C('span', { className: 'material-icons' }, 'send')
    )
  );
}

export default ChatInputArea;
