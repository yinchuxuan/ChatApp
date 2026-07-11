# Architecture

## 组成部分

- **主进程 (`main.js`)**：Electron 主进程，创建 `BrowserWindow`，管理应用生命周期，注册 IPC 处理器处理文件 I/O（模型配置、背景配置、聊天历史）。
- **预加载脚本 (`preload.js`)**：通过 `contextBridge` 桥接主进程与渲染进程，暴露 `window.electronAPI` 供渲染进程调用。
- **渲染进程 (`src/`)**：Vite 构建的 React 单页应用。`main.jsx` 是唯一入口，`App.jsx` 为根组件；平台模块通过 ESM `import/export` 连接，不依赖 HTML 脚本顺序或 `window.*` 模块注册。
- **聊天运行时 (`src/chat/`)**：通过独立 hook 管理 session、持久化、生成、重试、中止和滚动；`GameCardRuntimeProvider` 管理当前游戏卡、gameState 与运行时错误。
- **游戏卡核心 (`shared/game-card/`)**：平台无关的规则、content、state、schema 与协议适配逻辑。只处理普通数据，并通过显式依赖接入文件读取和脚本执行。
- **平台适配层 (`src/platform/`)**：定义 renderer 使用的游戏卡平台接口，并提供 Electron 与内存实现。未来 Tauri 前端需实现同一接口，不在 shared core 中增加平台判断。
- **IPC 处理器 (`ipc/`)**：处理器模块通过 `ipc/storage` 的异步原子 JSON store 读写 `userData`；聊天保存按 session 串行，目录导入使用异步文件 API。

## Renderer 样式

`src/main.jsx` 只导入 `src/styles/renderer.css`。该文件是平台 CSS 的唯一入口，并显式确定颜色、动画、组件和 utility 的加载顺序；`index.html` 不加载平台 CSS。

游戏卡样式不并入平台入口。`display.stylesheet`、`visual.stylesheet` 和 `ui.stylesheet` 通过 `src/gameCard` runtime 从当前卡目录读取，写入带 card id 和资源来源标记的独立 `<style>`，切换游戏卡时替换或清理。游戏卡 CSS 必须使用卡主题 class 或稳定的 `data-gc-part` hook 限定作用域。

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

游戏卡结构协议由 `shared/game-card/schema/game-card.schema.json` 唯一定义。导入和运行时共用 shared Ajv validator；Electron 只在结构校验通过后处理 import 循环、schema 注解声明的文件存在性及 state schema 内容等跨文件语义。未来平台后端必须复用同一 schema，而不是复制结构规则。

Renderer 中的游戏卡运行时通过以下接口访问平台能力：

```js
resources.readText(cardId, relativePath)
resources.getImageUrl(cardId, relativePath)
resources.getAudioUrl(cardId, relativePath)
repository.getActiveCard()
scriptExecutor.run(source, context, options)
```

`src/platform/electronGameCardPlatform.js` 将这些调用适配到现有 preload API；`sendPipeline` 只接收显式传入的 platform。脚本上下文构造和结果校验属于 shared core，受控 JavaScript 的具体执行环境属于 renderer adapter。

完整 adapter contract、调用方向和未来平台接入要求见 [Platform Adapter](./platform_adapter.md)。

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

旧版本根目录下的 `model-config.json`、`background-config.json`、`chat/history.json`、`chat-histories/chat-history.json` 会在启动阶段迁移到当前卡或 `no-card` session；旧 `cards/<id>.json` 会迁移为 `cards/<id>/card.json`。migration 在 IPC handler 注册之外集中执行，并在窗口创建前完成。

所有业务 JSON 写入先写入目标文件同目录的临时文件，再通过 `rename` 替换目标文件。配置、背景、游戏卡、session messages、retry base 和 metadata 共用该存储边界；同一 session 的聊天读写进入同一串行队列，避免并发保存交叉覆盖。

- **同步调用**：渲染进程调用 `ipcRenderer.invoke()` → 主进程通过 `ipcMain.handle()` 处理 → 返回结果。
- **异步事件**：主进程通过 `ipcRenderer.on('background-config-changed')` 向渲染进程推送配置变更通知。
- **安全隔离**：`contextIsolation: true`，`nodeIntegration: false` — 渲染进程不直接访问 Node API。
- **Renderer 加载**：开发模式加载 Vite dev server，生产和 E2E 加载 `dist/renderer/index.html`；`window.electronAPI` 是 preload 保留的平台边界。

## 测试边界

- `test/chat` 覆盖聊天 hook、生成、retry、渲染和 chat integration。
- `test/game-card` 覆盖 shared core、renderer runtime 和游戏卡 integration。
- `test/storage` 覆盖原子 JSON、migration、session 队列和持久化 IPC integration。
- `test/platform` 覆盖 adapter contract 与本地资源协议。
- `test/e2e` 只通过 UI 和 preload 边界验证 Electron，不依赖 renderer 内部全局模块。

普通 unit test mock 显式 service 或 memory adapter。`window.electronAPI` 只在 preload 边界和 Electron 组件测试中使用。

## 本地资源协议

renderer 只能通过受控的 `local://` URL 加载本地图片和音频：

- `local://game-card/<card-id>/<image|audio>/<relative-path>` 只解析当前活动且已安装游戏卡目录内的资源。
- `local://user-background/current` 只解析当前背景配置记录的用户背景文件。
- 主进程在每次请求时校验资源类型、扩展名和 `realpath`；路径穿越、符号链接逃逸及其它 `local://` URL 均被拒绝。
- 游戏卡资源 IPC 和背景配置 IPC 不向 renderer 返回真实绝对路径。用户背景的绝对路径只保存在主进程读取的配置字段中。
