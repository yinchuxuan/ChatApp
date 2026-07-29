import React from 'react';
import { renderHook } from '@testing-library/react';
import useLastUserMessageEdit from '../../src/renderer/chat/useLastUserMessageEdit.js';

describe('useLastUserMessageEdit', () => {
  test('exposes the latest user action without the hidden turn context', () => {
    const messages = [
      { role: 'user', content: '旧行动' },
      { role: 'assistant', content: '剧情' },
      {
        role: 'user',
        content: '去第三音乐室。\n\n---\n\n<wa2_turn_context>隐藏引导</wa2_turn_context>'
      }
    ];

    const { result } = renderHook(() => useLastUserMessageEdit(React, messages, true));

    expect(result.current.retrySource).toBe('去第三音乐室。');
  });
});
