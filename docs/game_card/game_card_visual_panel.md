# 游戏卡 Visual Panel 设计文档

## 目标

Visual panel 是游戏卡背景图上的剧情阅读面板。它解决两个问题：

- 背景图需要更完整地展示，而不是被全屏 veil 压平。
- AI 回复可能很长，文本区域必须适合连续阅读。

面板布局和样式属于 UI runtime 能力，不修改 messages，不进入 LLM prompt，也不影响 display rules 的文本变换结果。

## 设计原则

- `visual.background` 决定展示哪张图。
- `visual.textPanel` 决定剧情阅读面板放在哪里。
- 游戏卡 CSS 只控制视觉面板外观，不控制全局 App UI。
- 平台提供可读的基础样式；游戏卡可以覆盖变量和受控 class。
- 文本面板位置使用枚举，不开放任意坐标，避免布局失控。
- 移动端由平台自动降级，游戏卡不需要单独写复杂布局。

## 运行时状态

新增隐藏 state：

```json
{
  "visual.textPanel": {
    "type": "enum",
  "values": ["center", "left", "right"],
    "default": "center",
    "description": "剧情阅读面板位置",
    "llmRead": false,
    "llmWrite": false
  }
}
```

游戏卡规则通过 `state.set` 修改：

```json
{
  "type": "state.set",
  "path": "visual.textPanel",
  "value": "right"
}
```

`visual.textPanel` 应随 session 保存和恢复。LLM 不应直接读取或写入它，因为 LLM 通常不知道当前图片构图。

## 布局语义

| 值 | 桌面端行为 | 适用场景 |
|---|---|---|
| `center` | 居中窄阅读列 | 通用场景图、无明确主体 |
| `left` | 左侧阅读面板，右侧展示背景主体 | 主体在右侧 |
| `right` | 右侧阅读面板，左侧展示背景主体 | 主体在左侧 |
移动端保持平台默认居中阅读列，避免左右分栏挤压文字。

## 游戏卡配置

第一版可以在 `visual` 中声明样式文件：

```json
{
  "visual": {
    "stylesheet": "visual.css",
    "background": {
      "haiku": "images/haiku.png",
      "music_room": "images/music_room.png"
    }
  }
}
```

路径限制与 display stylesheet 一致：只能是当前游戏卡目录内的安全相对 CSS 路径，不能使用绝对路径或 `..`。

后续可以支持每张背景图的默认面板位置：

```json
{
  "visual": {
    "background": {
      "haiku": {
        "src": "images/haiku.png",
        "textPanel": "right"
      }
    }
  }
}
```

如果资源表带有 `textPanel`，切换背景时平台可自动应用该默认位置；规则中的显式 `visual.textPanel` 设置优先级更高。

## CSS 作用域

平台应给 App 根节点添加稳定作用域，例如：

```html
<div class="app-container has-background-image game-card-theme-white-album-2">
```

游戏卡 CSS 必须写在该作用域或平台提供的 visual class 下：

```css
.game-card-theme-white-album-2 .game-card-visual-panel {
  --game-card-panel-bg: rgba(18, 24, 38, 0.66);
}
```

游戏卡 CSS 不应覆盖 sidebar、settings、modal、button 等全局组件。

## 基础 Class

平台提供这些稳定 class：

```txt
.game-card-visual-layout
.game-card-visual-panel
.game-card-visual-content
.game-card-visual-highlight
.game-card-visual-position-center
.game-card-visual-position-left
.game-card-visual-position-right
```

`game-card-visual-position-*` 根据 `gameState.visual.textPanel` 自动切换。

## 推荐变量

游戏卡优先覆盖 CSS variables，而不是依赖内部 DOM：

```css
.game-card-theme-white-album-2 {
  --game-card-panel-width: 640px;
  --game-card-panel-bg: rgba(18, 24, 38, 0.62);
  --game-card-panel-border: rgba(255, 220, 170, 0.32);
  --game-card-panel-text: #f8efe2;
  --game-card-panel-highlight: #f4c982;
  --game-card-panel-line-height: 1.9;
  --game-card-panel-blur: 10px;
}
```

平台默认样式使用这些变量，并提供可读 fallback。

## 长文本策略

Visual panel 不要求把 AI 回复分页。默认行为是：

- 面板高度固定。
- 正文区域内部滚动。
- 历史消息仍按原 messages 保存。
- display rules 继续先处理文本，visual panel 只负责承载渲染结果。

未来可以在此基础上增加分页、自动阅读或 backlog，但不作为第一版要求。

## 与 Display CSS 的关系

`display.css` 负责消息内容内部样式，例如角色名、状态块、选项样式。

`visual.css` 负责背景图阅读面板样式，例如面板透明度、边框、文字颜色、行距和面板宽度。

两者可以同时生效，但职责不同，避免一个 CSS 文件承担所有视觉规则。

## 测试建议

- `visual.textPanel` state 默认值、保存和恢复。
- `state.set` 能切换三种面板位置。
- `visual.stylesheet` 只能加载安全相对 CSS。
- 游戏卡 CSS 不影响全局设置弹窗和侧栏。
- 桌面与移动视口下文字不溢出、不重叠。
