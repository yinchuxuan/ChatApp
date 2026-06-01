# 游戏卡 Display Rules

## 目标

Display rules 定义 user / assistant 消息进入普通对话流渲染前的 UI-only 变换。

它只影响视觉呈现，不修改:

- `messages` 原文
- 聊天历史保存内容
- 发送给 LLM 的 API messages
- game card `rules` 的运行时输入

因此 display rules 适合处理“给模型和后续规则保留，但不直接展示给玩家”的内容，例如 `<summary>...</summary>`，也适合把轻量文本约定转换成更丰富的 UI 样式。

## 设计原则

- 自然文本是默认路径；LLM 不需要为了显示而输出大量标签。
- 标签只用于隐藏内容或少量结构化内容。
- 常见视觉增强优先使用正则规则识别自然文本。
- 规则失败不能阻断消息显示；失败规则应跳过并记录错误。
- 变换后的内容仍必须经过 Markdown 渲染和 HTML sanitize。
- 只处理普通对话流中的 user / assistant content，不处理 `_thinking`。

## 配置结构

Display rules 位于游戏卡顶层:

```json
{
  "display": {
    "assistant": [
      {
        "id": "hide-summary",
        "enabled": true,
        "stage": "before_markdown",
        "type": "regex_replace",
        "pattern": "<summary>[\\s\\S]*?<\\/summary>",
        "flags": "g",
        "replace": ""
      }
    ]
  }
}
```

`display.user` / `display.assistant` 中的规则按数组顺序执行。每条规则的输出作为下一条规则的输入。

## 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 规则标识，用于 debug 和错误提示 |
| `enabled` | boolean | 可选，`false` 时跳过；默认 `true` |
| `stage` | string | 执行阶段，第一版只支持 `before_markdown` |
| `type` | string | 规则类型，第一版只支持 `regex_replace` |
| `pattern` | string | JavaScript 正则源码，不包含 `/.../` 包裹 |
| `flags` | string | 正则 flags，建议只允许 `gimsu` |
| `replace` | string | 替换内容，使用 JavaScript replace 语义 |

## Stage

第一版只开放:

| stage | 输入 | 输出 | 用途 |
|---|---|---|---|
| `before_markdown` | user / assistant 原始 `content` | Markdown 源文本 | 隐藏标签、包装文本约定、轻量格式增强 |

后续可考虑增加:

| stage | 输入 | 用途 |
|---|---|---|
| `after_markdown` | Markdown 转换后的 HTML | 对 HTML 结构做受控增强 |

`after_markdown` 更容易误伤 HTML，第一版不建议开放。

## Regex Replace

`regex_replace` 等价于:

```js
content.replace(new RegExp(pattern, flags), replace)
```

`replace` 支持 JavaScript replace 的 capture group:

- `$1`, `$2`: 捕获组
- `$&`: 完整匹配
- ``$` ``: 匹配前文本
- `$'`: 匹配后文本

示例: 隐藏 summary 标签。

```json
{
  "id": "hide-summary",
  "stage": "before_markdown",
  "type": "regex_replace",
  "pattern": "<summary>[\\s\\S]*?<\\/summary>",
  "flags": "g",
  "replace": ""
}
```

输入:

```txt
「你终于来了。」

<summary>
玩家抵达音乐室。雪菜情绪紧张。
</summary>
```

UI 显示:

```txt
「你终于来了。」
```

原始 `msg.content` 仍保留 `<summary>`。

## 自然文本增强

Display rules 不要求 assistant 输出大量标签。推荐用正则识别轻量文本约定。

示例: 将角色名行包装成 speaker 样式。

```json
{
  "id": "speaker-line",
  "stage": "before_markdown",
  "type": "regex_replace",
  "pattern": "^【(.+?)】$",
  "flags": "gm",
  "replace": "<div class=\"rp-speaker\">$1</div>"
}
```

输入:

```txt
【雪菜】
「你来了。」
```

渲染前转换为:

```html
<div class="rp-speaker">雪菜</div>
「你来了。」
```

之后继续走 Markdown、sanitize、quote highlight 和 DOM 渲染。

## 标签增强

标签适合用于隐藏或结构化附加内容，不建议覆盖正文叙事。

示例: 状态块。

```json
{
  "id": "status-block",
  "stage": "before_markdown",
  "type": "regex_replace",
  "pattern": "<status>([\\s\\S]*?)<\\/status>",
  "flags": "g",
  "replace": "<div class=\"rp-status\">$1</div>"
}
```

## 安全边界

- 不支持 display `exec` 或任意 JavaScript。
- 不支持事件属性、脚本注入或内联行为。
- `flags` 应限制为 `gimsu`，不开放 `y`。
- 应限制规则数量、`pattern` 长度和输入长度，避免灾难性正则拖慢 UI。
- 所有 display 输出必须继续经过 `DOMPurify.sanitize`。
- display rules 不应改变 retry、history、API request 或 game state。

## 与酒馆正则方案的关系

本设计借鉴 SillyTavern 常见正则美化插件的思路: 用正则在渲染管线中对消息做格式化，并区分 display-only 与 prompt/history 变更。

但第一版刻意比酒馆更简单:

- 只作用于 user / assistant 对话流显示
- 只处理当前单条消息
- 只支持 `before_markdown`
- 只支持 `regex_replace`
- 永远 display-only，不写回聊天记录
