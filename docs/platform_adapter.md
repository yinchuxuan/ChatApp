# Platform Adapter

## 目标

平台 adapter 隔离游戏卡 renderer runtime 与 Electron preload。Shared game card core 只接收普通数据和显式依赖，不读取 `window`、DOM、Electron 或本地文件系统。

## Renderer Contract

`src/platform/gameCardPlatform.js` 创建并校验以下接口：

```js
{
  resources: {
    readText(cardId, relativePath),
    getImageUrl(cardId, relativePath),
    getAudioUrl(cardId, relativePath)
  },
  repository: {
    getActiveCard()
  },
  scriptExecutor: {
    run(source, context, options)
  }
}
```

平台对象及其三个子接口创建后被冻结。调用方不能在运行时替换方法。

该接口以及 renderer 的 `config`、`background`、`sessions`、`cards` service 类型集中定义在 `src/platform/contracts.js`。adapter 工厂通过 JSDoc 引用同一 contract，避免各实现各自描述返回结构。

## 实现

`electronGameCardPlatform.js` 通过 `window.electronAPI` 调用 preload IPC，并将 `{ success, content/url/card }` 返回值解包为 contract 的直接返回值或异常。

`tauriGameCardPlatform.js` 和 `tauriRendererServices.js` 通过 Tauri `invoke` 调用业务 command，并通过 `listen` 订阅背景配置变更。adapter 接受 Rust `Result` 的直接 payload 和迁移期 `{ success, ... }` envelope，并将取消、业务错误、文件及校验详情归一化为 JavaScript `Error`。图片、音频和用户背景 URL 通过 `convertFileSrc` 生成，以适配各系统的自定义协议 URL 形式。

Tauri Rust 后端已实现 model/background config、完整 session/history command、游戏卡仓库、目录导入、文本资源及受控图片/音频协议。游戏卡导入由 Rust dialog 选择目录，在临时目录校验后替换并保留同 id 卡片的 session。用户背景同样由 Rust dialog 选择，真实路径只存于 native 配置。

模型网络同样位于平台边界。Electron 使用 browser `fetch`，开发模式可经 Vite 同源代理；Tauri 使用 Rust HTTP command 和 Channel。Tauri adapter 将 Channel 字节包装为 `ReadableStream` 兼容响应，因此 `src/chat/apiClient.js` 继续复用同一套 OpenAI/Anthropic SSE parser。`AbortSignal` 通过 request id 映射到 native cancel command。

`memoryGameCardPlatform.js` 是测试 adapter。它从内存中的 card、文本、图片 URL 和音频 URL 读取资源，并复用受控脚本执行器。聊天管线和 shared core 测试应优先使用它，只有 Electron 边界测试才直接 mock preload API。

`controlledScriptExecutor.js` 属于 renderer adapter：它提供受控 JavaScript 执行环境。脚本上下文和返回值协议位于 `shared/game-card/exec`，不属于具体平台。

Electron renderer 中的 `scriptExecutor.run()` 返回 Promise，并在独立 Worker 中执行；超时会终止 Worker。聊天运行时因此使用 `applyGameCardAsync()`。同步 `applyGameCard()` 只用于 Node `vm` 环境和不含异步 executor 的 core 调用。

## 调用方向

```txt
React / src/gameCard runtime
  -> game card platform contract
    -> Electron adapter
      -> preload window.electronAPI
        -> IPC handlers

React / src/gameCard runtime
  -> game card platform contract
    -> Tauri adapter
      -> invoke / listen
        -> Rust commands / events

React / src/gameCard runtime tests
  -> memory adapter
```

`sendPipeline`、样式加载、背景、BGM 和自定义 UI 资源读取都接收或使用 platform contract。Shared core 不选择 Electron 或 Tauri adapter。

图片和音频 URL 只允许为当前活动卡解析。Electron IPC 和 Tauri 自定义协议在资源实际加载时校验 `cardId`；Tauri adapter 只负责生成平台对应的 URL，不承担授权。`readText` 可读取指定的已安装卡，用于导入展开和加载卡资源，但仍受游戏卡目录路径校验约束。

## 新平台

Vite 使用构建常量选择 Electron 或 Tauri adapter。不要在 shared core 或 React 业务组件中增加运行时平台判断，也不要复制游戏卡 schema 或规则引擎。

新 adapter 至少需要通过：

- 文本、图片和音频资源成功与失败路径。
- active card 不存在、读取失败和合法返回路径。
- init、pre-send、after-response 完整内存管线。
- 受控脚本 context 与 result 校验。
- 本地资源不能越过已安装游戏卡目录的安全测试。
