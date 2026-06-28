# 游戏卡 UI Runtime 设计草案

## 目标

游戏卡需要两类前端扩展能力：

- 风格化已有平台 UI：输入框、消息区、气泡、标题栏、BGM 控件、阅读遮罩等。
- 新增自定义交互 UI：可点击选项、物品栏、人物状态、战斗界面、演出层等。

核心原则：

```txt
React 负责 UI 自由度
script 负责本地规则计算
platform 负责状态权威、消息发送、保存和调试
```

游戏卡 UI 可以非常灵活，但状态变更必须回到平台的 `state/script/effects` 管线。

## 现有能力

当前已有几层 UI 扩展：

- `display.assistant` / `display.user`：在 Markdown 前对消息文本做 `regex_replace`。
- `display.stylesheet`：加载游戏卡 CSS，主要用于消息内部样式。
- `visual.background`：通过 `gameState.visual.background` 切换背景图。
- `visual.textPanel`：控制阅读面板位置，取值为 `center` / `left` / `right`。
- `visual.stylesheet`：加载游戏卡视觉 CSS，主要用于背景模式下阅读界面。

这些能力适合文本显示和视觉风格，但不够支持复杂交互 UI。

## 已有 UI 的 CSS 自定义

第一步应扩展当前样式能力，让游戏卡可以安全地风格化所有平台 UI。

第一步新增统一入口：

```json
{
  "ui": {
    "stylesheet": "ui.css"
  }
}
```

实现上复用当前 `display.stylesheet` / `visual.stylesheet` 的加载机制。

平台给主要 UI 节点提供稳定 style hooks：

```html
<div data-gc-part="app">
<div data-gc-part="chat-panel">
<div data-gc-part="chat-history">
<div data-gc-part="message-row" data-role="assistant">
<div data-gc-part="message-bubble">
<div data-gc-part="message-content">
<form data-gc-part="chat-input">
<textarea data-gc-part="chat-input-textarea">
<button data-gc-part="chat-send-button">
```

游戏卡 CSS 必须按主题作用域编写：

```css
.game-card-theme-white-album-2 [data-gc-part="chat-input"] {
  background: rgba(20, 24, 32, 0.58);
  backdrop-filter: blur(8px);
}
```

常见样式优先使用 CSS variables：

```css
.game-card-theme-white-album-2 {
  --gc-input-bg: rgba(20, 24, 32, 0.56);
  --gc-input-text: #fff4e6;
  --gc-message-font: "Noto Serif SC", serif;
  --gc-message-line-height: 1.9;
  --gc-assistant-bubble-bg: transparent;
  --gc-user-bubble-bg: rgba(40, 70, 110, 0.5);
}
```

CSS 只负责视觉，不负责点击逻辑、状态变更和消息发送。

## 自定义 React UI Root

复杂交互应通过游戏卡自定义 React UI 实现。平台提供一个覆盖整个窗口的托管 root：

```html
<div id="app-root">平台 UI</div>
<div id="game-card-ui-root">游戏卡 React UI</div>
```

`GameCardUIRoot` 可以全屏覆盖：

```css
#game-card-ui-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}
```

游戏卡组件内部需要交互的区域自行开启 `pointer-events: auto`。

游戏卡声明：

```json
{
  "ui": {
    "root": {
      "type": "react",
      "source": "ui/root.js",
      "style": "ui/root.css"
    }
  }
}
```

组件拿到受控 props：

```js
{
  React,
  state,
  messages,
  ui,
  props,
  assets,
  emit
}
```

`source` 是浏览器安全 JS 文件，必须导出或定义名为 `Root` 的 React 组件。当前 runtime 不做 JSX 编译；需要使用 `React.createElement` 或预编译后的 JS。

```js
function Root({ React, state, props, emit }) {
  return React.createElement(
    "button",
    {
      style: { pointerEvents: "auto" },
      onClick: () => emit({ type: "chat.input.set", value: props.choice, focus: true })
    },
    props.choice
  );
}
```

组件可以在自己的 root 内渲染 React UI：常驻 HUD、物品栏、选项按钮、Canvas、SVG、动画等。需要交互的区域自行设置 `pointer-events: auto`。

## 事件与脚本

React 组件不直接修改 `gameState`，只发受控事件：

```js
emit({ type: "chat.input.set", value: "A. 去第三音乐室", focus: true });
emit({ type: "chat.send", content: "继续" });
```

平台处理事件：

```txt
emit -> 平台受控事件 -> 输入框/发送管线 -> 保存 session -> 重新渲染
```

第一批已支持事件：`chat.input.set`、`chat.input.append`、`chat.input.clear`、`chat.input.focus`、`chat.input.submit`、`chat.send`。

`script.run` 和状态 patch 类交互需要后续接入 script/effects 管线后再开放。

## 输入框行为

输入框行为通过平台级 runtime 事件处理，不写入游戏规则 state。

第一批 action：

```txt
chat.input.set
chat.input.append
chat.input.clear
chat.input.focus
chat.input.submit
chat.send
```

可点击选项默认行为建议为：填入输入框并聚焦，而不是直接发送。

## 边界

默认模式下：

- 游戏卡可以在 `GameCardUIRoot` 内任意渲染 React。
- 游戏卡不能直接修改平台 DOM、Electron API 或内部 React state。
- 状态变更必须走 `statePatch`。
- 演出和临时 UI 反馈通过 `effects`。

如果未来需要酒馆式全局魔改，可以单独设计 `trusted_shell` 模式，并在导入时明确提示风险。
