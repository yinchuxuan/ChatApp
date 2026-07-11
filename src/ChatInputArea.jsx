import React from 'react';
import { subscribeChatInputCommands } from './chat/chatInputCommands.js';

function ChatInputArea({
  isLoading,
  isInputHovered,
  setIsInputHovered,
  isInputTriggerHovered,
  setIsInputTriggerHovered,
  onSend,
  onStop
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
    const accepted = await onSend?.(value);
    if (!accepted) return;
    setInputValue(''); setIsInputHovered(false); setIsInputTriggerHovered(false);
    const textarea = formElement?.querySelector('textarea') || textareaRef.current;
    if (textarea) textarea.blur();
  }, [isLoading, onSend, setIsInputHovered, setIsInputTriggerHovered]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) { onStop?.(); return; }
    await submitValue(inputValue, e.currentTarget);
  };

  R.useEffect(() => {
    const handler = (action = {}) => {
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
    return subscribeChatInputCommands(handler);
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
