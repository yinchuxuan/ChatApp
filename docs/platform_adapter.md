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

`electronGameCardPlatform.js` 是生产 adapter。它通过 `window.electronAPI` 调用 preload IPC，并将 `{ success, content/url/card }` 返回值解包为 contract 的直接返回值或异常。

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

React / src/gameCard runtime tests
  -> memory adapter
```

`sendPipeline`、样式加载、背景、BGM 和自定义 UI 资源读取都接收或使用 platform contract。Shared core 不选择 Electron 或 Tauri adapter。

图片和音频 URL 只允许为当前活动卡解析，adapter 和 IPC 都必须校验 `cardId`。`readText` 可读取指定的已安装卡，用于导入展开和加载卡资源，但仍受游戏卡目录路径校验约束。

## 新平台

未来 Tauri renderer adapter 必须实现同一 contract，并负责将 Tauri command 返回值转换成 contract 结果。不要在 shared core 中增加运行时平台判断，也不要复制游戏卡 schema 或规则引擎。

新 adapter 至少需要通过：

- 文本、图片和音频资源成功与失败路径。
- active card 不存在、读取失败和合法返回路径。
- init、pre-send、after-response 完整内存管线。
- 受控脚本 context 与 result 校验。
- 本地资源不能越过已安装游戏卡目录的安全测试。
