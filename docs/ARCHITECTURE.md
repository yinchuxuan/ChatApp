# 知识库应用架构文档

## 项目概述

基于 Electron + React 的桌面 AI 聊天应用，支持文档管理和多模型对话。

## 技术栈

- **桌面框架**: Electron 28 | **UI**: React 18 | **依赖**: marked (Markdown渲染)
- **测试**: Jest + React Testing Library + Playwright (E2E)
- **工程化**: Babel | ESLint | Husky + lint-staged

## 项目结构

```
harness_lab/
├── main.js / preload.js          # Electron 主进程 & 安全桥接
├── ipc/                          # IPC 处理 (backgroundHandlers, configHandlers)
├── src/                          # 渲染进程 React 应用
│   ├── App.jsx / ChatPanel.jsx   # 主容器 & 聊天面板
│   ├── components/               # SettingsPanel, SettingsModelConfig, useTypewriter 等
│   └── styles/                   # 模块化 CSS (dark/light 主题, 组件样式, 动画)
├── test/                         # 单元 & 集成测试
└── docs/                         # 架构文档
```

## 数据流与安全

React 组件 → preload.js (contextBridge) → main.js (IPC) → 文件系统
contextIsolation: true | nodeIntegration: false

## 构建与测试

```bash
npm run dev       # 启动应用    npm test          # 单元+集成+E2E
npm run build     # 打包构建    npm run test:e2e  # Playwright E2E
```
