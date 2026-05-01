# 知识库应用架构文档

## 项目概述

基于 Electron + React 的桌面 AI 聊天应用，支持文档管理和多模型对话。

## 技术栈

- **桌面框架**: Electron 28 | **UI**: React 18 | **依赖**: marked (Markdown渲染)
- **测试**: Jest + React Testing Library + Playwright (E2E)
- **工程化**: Babel | ESLint | Husky + lint-staged

## 项目结构

```
ChatApp/
├── main.js / preload.js            # Electron 主进程 & contextBridge 安全桥接
├── ipc/                            # IPC handlers: background, config, chatHistory
├── src/                            # 渲染进程 React 应用
│   ├── App.jsx                     # 根组件: 主题管理、背景、路由 ChatPanel/SettingsPanel
│   ├── ChatPanel.jsx               # 聊天面板: 消息列表、流式渲染、历史加载/保存
│   ├── ChatInputArea.jsx           # 输入区域: 用户输入、发送消息、流式API调用
│   ├── components/                 # SettingsPanel, SettingsModelConfig, apiClient,
│   │                               #   ChatPanelRenderers, useSettingsState, useTypewriter
│   └── styles/                     # 模块化 CSS: 主题(dark/light)、组件、动画、工具类
├── test/                           # 单元 & 集成 & E2E 测试 (Jest + Playwright)
└── docs/                           # 架构、代码规范、UI设计文档
```

## 数据流与安全

React 组件 → preload.js (contextBridge) → main.js (IPC) → 文件系统
contextIsolation: true | nodeIntegration: false

## 构建与测试

```bash
npm run dev       # 启动应用    npm test          # 单元+集成+E2E
npm run build     # 打包构建    npm run test:e2e  # Playwright E2E
```
