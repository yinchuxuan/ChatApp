# Architecture

## 组成部分

- **主进程 (`main.js`)**：Electron 主进程，创建 `BrowserWindow`，管理应用生命周期，注册 IPC 处理器处理文件 I/O（模型配置、背景配置、聊天历史）。
- **预加载脚本 (`preload.js`)**：通过 `contextBridge` 桥接主进程与渲染进程，暴露 `window.electronAPI` 供渲染进程调用。
- **渲染进程 (`src/`)**：Vite 构建的 React 单页应用。`main.jsx` 是唯一入口，`App.jsx` 为根组件；平台模块通过 ESM `import/export` 连接，不依赖 HTML 脚本顺序或 `window.*` 模块注册。
- **聊天运行时 (`src/chat/`)**：通过独立 hook 管理 session、持久化、生成、重试、中止和滚动；`GameCardRuntimeProvider` 管理当前游戏卡、gameState 与运行时错误。
- **游戏卡核心 (`shared/game-card/`)**：平台无关的规则、content、state、schema 与协议适配逻辑。只处理普通数据，并通过显式依赖接入文件读取和脚本执行。
- **平台适配层 (`src/platform/`)**：定义 renderer 使用的游戏卡平台接口，并提供 Electron 与内存实现。未来 Tauri 前端需实现同一接口，不在 shared core 中增加平台判断。
- **IPC 处理器 (`ipc/`)**：处理器模块读写 `userData` 目录下按领域分组的 JSON 文件：`config/`、`game-cards/`。

## 交互流程

```
渲染进程 (React)
    |  invoke('get-model-config') / invoke('save-chat-history') / ...
    v
预加载脚本 (contextBridge)
    |  转发至 ipcRenderer.invoke()
    v
主进程 (ipcMain)
    |  委托给 ipc/{config,background,chatHistory}Handlers
    |  读写 app.getPath('userData') 下的 JSON 文件
    v
文件系统 (JSON)
```

游戏卡调用方向为 `src/gameCard` renderer 适配层或 `ipc/` Electron 适配层指向 `shared/game-card`。Shared core 不依赖 DOM、React、Electron、Node 文件系统或本地绝对路径。

Renderer 中的游戏卡运行时通过以下接口访问平台能力：

```js
resources.readText(cardId, relativePath)
resources.getImageUrl(cardId, relativePath)
resources.getAudioUrl(cardId, relativePath)
repository.getActiveCard()
scriptExecutor.run(source, context, options)
```

`src/platform/electronGameCardPlatform.js` 将这些调用适配到现有 preload API；`sendPipeline` 只接收显式传入的 platform。脚本上下文构造和结果校验属于 shared core，受控 JavaScript 的具体执行环境属于 renderer adapter。

聊天界面中的输入命令和模型配置通知通过 `src/chat` 下的显式 service 传递。游戏卡切换由 `GameCardRuntimeProvider` 与 props 回调协调，背景和视觉面板状态通过组件 props 回传给 `App`；renderer 组件之间不使用 DOM `CustomEvent` 作为内部消息总线。

## userData 结构

默认应用名为 `ChatApp`，因此 Electron 默认数据目录会使用该名称。业务数据结构如下：

```
userData/
  config/
    model.json
    background.json
  game-cards/
    active.json
    no-card/
      sessions/
        active.json
        <session-id>/
          messages.json
    cards/
      <card-id>/
        card.json
        sessions/
          active.json
          <session-id>/
            messages.json
```

旧版本根目录下的 `model-config.json`、`background-config.json`、`chat/history.json`、`chat-histories/chat-history.json` 会在读取时迁移到当前卡或 `no-card` session；旧 `cards/<id>.json` 会迁移为 `cards/<id>/card.json`。

- **同步调用**：渲染进程调用 `ipcRenderer.invoke()` → 主进程通过 `ipcMain.handle()` 处理 → 返回结果。
- **异步事件**：主进程通过 `ipcRenderer.on('background-config-changed')` 向渲染进程推送配置变更通知。
- **安全隔离**：`contextIsolation: true`，`nodeIntegration: false` — 渲染进程不直接访问 Node API。
- **Renderer 加载**：开发模式加载 Vite dev server，生产和 E2E 加载 `dist/renderer/index.html`；`window.electronAPI` 是 preload 保留的平台边界。

## 本地资源协议

renderer 只能通过受控的 `local://` URL 加载本地图片和音频：

- `local://game-card/<card-id>/<image|audio>/<relative-path>` 只解析当前活动且已安装游戏卡目录内的资源。
- `local://user-background/current` 只解析当前背景配置记录的用户背景文件。
- 主进程在每次请求时校验资源类型、扩展名和 `realpath`；路径穿越、符号链接逃逸及其它 `local://` URL 均被拒绝。
- 游戏卡资源 IPC 和背景配置 IPC 不向 renderer 返回真实绝对路径。用户背景的绝对路径只保存在主进程读取的配置字段中。
