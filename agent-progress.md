# 进度日志

## 2026-05-01 session

### app-001: 代码重构（不影响应用功能）
- **Status**: passing (accepted after two revision rounds)
- **Changes**: Eliminated duplicate error handling in apiClient.js, fixed isLoadingRef._streaming anti-pattern in useTypewriter.js, simplified MIME type mapping in backgroundHandlers.js, removed dead renderChatHistory from ChatPanelRenderers.js
- **Verification**: 188 unit tests, 23 integration tests, 40 e2e tests passed; eslint clean
- **Committed as**: 26b9a54

### app-001: 更新架构文档
- **Status**: passing (accepted after one review; initial e2e flaky failure cleared on re-run)
- **Changes**: Updated docs/ARCHITECTURE.md to reflect current src/ structure (40 lines)
- **Verification**: 188 unit tests, 23 integration tests, 40 e2e tests passed; eslint clean; no code files modified
- **Committed as**: d4d3770

### app-001: 修改msg历史记录的显示格式
- **Status**: passing (accepted after one review)
- **Changes**: Replaced individual `<pre>` elements with a single `.msg-history-card` containing `{ msgs: {} }` JSON structure; CSS uses same variables as assistant answer cards for color/transparency consistency
- **Verification**: 196 unit + 23 integration + 42 e2e = 261 tests passed; eslint clean
- **Committed as**: fd26e2b

### app-002: 修改聊天区两侧padding
- **Status**: passing (accepted after one review)
- **Changes**: Changed `.chat-history` padding from `20px 28px 80px` to `20px 10% 80px`; all cards (user, assistant, msg-history) use `width: 100%` to inherit 10% side padding
- **Verification**: 199 unit + 26 integration + 45 e2e = 270 tests passed; eslint clean
- **Committed as**: a27227b

### app-001: 将user/assistant内容卡片按markdown渲染呈现
- **Status**: passing (accepted after one revision round for XSS fix)
- **Changes**: Added renderMarkdown() function using marked.parse() + DOMPurify.sanitize() in ChatPanel.jsx; added CSS for markdown elements in components.chat-messages.css; added DOMPurify script in index.html; added 9 unit tests + 7 e2e tests for markdown rendering and XSS protection
- **Verification**: 208 unit + 26 integration + 7 e2e = 241 tests passed; eslint clean
- **Committed as**: f6ff0c8

### app-002: 优化e2e测试
- **Status**: passing (accepted after one review)
- **Changes**: playwright.config.js: workers changed from 1 to Math.min(4, os.cpus().length) for multi-worker parallel execution; maxFailures changed from 0 to 1 for fail-fast on first failure
- **Verification**: 199 unit + 26 integration + 43 e2e (2 skipped, missing env vars) = 268 tests passed; eslint clean
- **Committed as**: 37ad3ec

---

## 历史记录

