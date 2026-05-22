# Architecture

## 组成部分

- **主进程 (`main.js`)**：Electron 主进程，创建 `BrowserWindow`，管理应用生命周期，注册 IPC 处理器处理文件 I/O（模型配置、背景配置、聊天历史）。
- **预加载脚本 (`preload.js`)**：通过 `contextBridge` 桥接主进程与渲染进程，暴露 `window.electronAPI` 供渲染进程调用。
- **渲染进程 (`src/`)**：React 单页应用。`App.jsx` 为根组件；`ChatPanel.jsx`、`ChatInputArea.jsx` 处理聊天 UI；`components/` 包含设置面板、消息渲染器和自定义 hooks。
- **IPC 处理器 (`ipc/`)**：三个处理器模块 — `configHandlers`、`backgroundHandlers`、`chatHistoryHandlers` — 读写 `userData` 目录下的 JSON 文件。

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

- **同步调用**：渲染进程调用 `ipcRenderer.invoke()` → 主进程通过 `ipcMain.handle()` 处理 → 返回结果。
- **异步事件**：主进程通过 `ipcRenderer.on('background-config-changed')` 向渲染进程推送配置变更通知。
- **安全隔离**：`contextIsolation: true`，`nodeIntegration: false` — 渲染进程不直接访问 Node API。
