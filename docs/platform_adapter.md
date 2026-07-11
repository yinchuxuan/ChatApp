# Platform Adapter

## 目标

平台 adapter 隔离 React/game card runtime 与 Tauri native backend。Shared core 只接收普通数据和显式依赖，不读取 `window`、DOM、本地文件系统或 Tauri API。

Tauri 是唯一桌面 target；memory adapter 用于 unit test，不参与生产构建。

## Game Card Contract

`src/platform/gameCardPlatform.js` 创建并冻结以下接口：

```js
{
  resources: {
    readText(cardId, relativePath),
    getImageUrl(cardId, relativePath),
    getAudioUrl(cardId, relativePath)
  },
  repository: { getActiveCard() },
  scriptExecutor: { run(source, context, options) }
}
```

`tauriGameCardPlatform.js` 将文本与 active card 映射为 `invoke`，将图片和音频映射为 `convertFileSrc` 生成的受控 `local` URL。资源授权在 Rust 协议实际读取时再次校验。

`memoryGameCardPlatform.js` 从内存中的 card、文本和 URL 读取资源。聊天管线与 shared core 单元测试应优先使用它。

## Renderer Services

配置、背景、Session 与卡片导入 contract 集中定义在 `src/platform/contracts.js`：

```txt
rendererServices.config
rendererServices.background
rendererServices.sessions
rendererServices.cards
```

`tauriRendererServices.js` 将 contract 映射为业务级 command，并用 `listen` 订阅背景配置变更。adapter 负责将 Rust 错误、取消和校验详情归一化为 JavaScript `Error`。

## 模型网络

`tauriModelFetch.js` 使用 Rust `stream_model_request` 和 Channel，将响应包装成兼容 `fetch` 的 `ReadableStream`。`src/chat/apiClient.js` 因此继续复用 OpenAI/Anthropic SSE parser。

`AbortSignal` 通过 request id 映射到 `cancel_model_stream`。renderer 不直接连接模型外网，也不维护额外 CORS 代理。

## 受控脚本

`controlledScriptExecutor.js` 在独立 Worker 中执行游戏卡 JavaScript，超时会终止 Worker。脚本 context 和 result 协议位于 `shared/game-card/exec`；DOM、native command 和本地文件能力不会进入脚本上下文。

## 调用方向

```txt
React / game card runtime
  -> platform contract
    -> Tauri adapter
      -> invoke / listen / Channel / convertFileSrc
        -> Rust backend

Unit tests
  -> memory adapter or mocked Tauri client
```

新增平台能力时先扩展业务级 contract，再实现 Rust command 和 adapter。不要在组件或 shared core 中直接 import Tauri API，也不要复制游戏卡 schema 或规则引擎。

## Contract Tests

adapter 至少覆盖：

- 文本、图片、音频和 active card 的成功与失败路径。
- 配置、背景、Session 和导入 command 的 payload 与错误归一化。
- init、pre-send、after-response 的完整内存管线。
- Worker context、返回值校验、超时和中止。
- 本地资源不能越过当前游戏卡目录。
