# 游戏卡 Visual 设计文档

## 目标

Visual 定义游戏卡可使用的本地视觉资源，并通过 `gameState` 控制当前展示内容。

第一版只设计背景图：游戏卡声明背景 key 到资源路径的映射，运行时自动派生当前背景 key 的隐藏 state schema，现有 state action 修改当前背景 key，前端监听 `gameState.visual.background` 并显示对应资源。

Visual 不进入 LLM prompt，不写入消息正文，也不由 display rules 处理。

## 设计原则

- `card.visual` 是资源表，`gameState.visual` 是当前会话状态。
- 背景状态跟随 session 保存和加载，切换 session 时恢复。
- 游戏卡规则只修改语义化 key，不直接散落文件路径。
- 图片资源只能来自当前游戏卡目录，禁止路径穿越。
- 视觉背景是 UI 运行时能力，不改变 messages、retry base 或 LLM 请求。
- 游戏卡背景优先级高于用户设置背景；当前游戏卡没有背景时回落到用户设置背景。

## 游戏卡配置

顶层 `visual` 使用按类型分组的资源表：

```json
{
  "visual": {
    "background": {
      "school": "images/school.jpg",
      "music_room": "images/music_room.webp",
      "night": "images/night.png"
    }
  }
}
```

路径必须是游戏卡目录内的相对路径，不允许以 `/`、`\` 开头，不允许 `..` 路径段，建议只允许 `.png`、`.jpg`、`.jpeg`、`.webp`、`.gif`、`.bmp`。

## State Schema

当前背景 key 由 `gameState.visual.background` 表示。运行时应从 `card.visual.background` 自动派生 schema，游戏卡无需重复声明：

```json
{
  "visual.background": {
    "type": "enum",
    "values": ["school", "music_room", "night"],
    "default": "school",
    "description": "当前展示的背景图 key",
    "llmRead": false,
    "llmWrite": false
  }
}
```

schema 的 `values` 与 `card.visual.background` 的 key 对齐，`default` 使用资源表的第一个 key。

运行时 state 保存为嵌套 JSON：

```json
{
  "visual": {
    "background": "school"
  }
}
```

## 规则更新

游戏卡继续使用现有 state action：

```json
{
  "type": "state.set",
  "path": "visual.background",
  "value": "music_room"
}
```

语义等价于：

```js
gameState.visual.background = "music_room";
```

示例：进入固定剧情节点时切换背景图。

```json
{
  "when": {
    "phase": "pre_send",
    "state": {
      "timeline.currentTime": {
        "gte": "2007.10.21: 16:00 星期日",
        "lt": "2007.10.21: 18:00 星期日"
      }
    }
  },
  "then": [
    {
      "type": "state.set",
      "path": "visual.background",
      "value": "music_room"
    }
  ]
}
```

## 前端渲染

前端背景运行时输入为：

- active game card
- current `gameState.visual.background`
- 用户设置背景配置

解析流程：

```txt
gameState.visual.background
  -> card.visual.background[backgroundKey]
  -> getGameCardImageUrl(relativePath)
  -> App 背景图
```

行为要求：

- active game card 为空时使用用户设置背景。
- 当前 key 缺失或资源不存在时使用用户设置背景并记录错误。
- 切换游戏卡时清理旧游戏卡背景。
- 切换 session 后按恢复出的 `gameState.visual.background` 展示背景。
- 相同 key 不重复解析资源 URL。
- LLM 回复期间的背景变更等到正文第一个 token 开始流式输出时展示。
- 游戏卡背景只覆盖背景图片，不覆盖用户设置的遮罩透明度；透明度仍使用现有 `backgroundOpacity`。

## IPC 与资源安全

渲染进程不直接读取本地文件。preload 应暴露安全接口，例如：

```js
window.electronAPI.getGameCardImageUrl("images/school.jpg");
```

主进程校验当前 active game card 存在、path 是安全相对路径、解析后的绝对路径仍位于当前游戏卡目录内，且扩展名属于允许的图片类型。

返回值应是可供 CSS `background-image` 加载的安全 URL 或失败结果。

## 与 Display Rules 的关系

Visual 不通过 display rules 实现。

display rules 是 UI-only 文本变换，只作用于消息内容渲染；背景图是本地运行时状态，来源应是 `gameState.visual.background`。这样不会污染历史消息，也不会把视觉控制标签发给 LLM。

## 与 Audio 的关系

Visual 与 Audio 使用相同资源表模式：

```txt
card.audio.bgm + gameState.audio.bgm
card.visual.background + gameState.visual.background
```

两者都应自动派生隐藏 state schema，避免游戏卡作者在 `state.schema` 中重复声明运行时资源 key。

## 后续扩展

可以在相同结构下扩展其它视觉类型：

```json
{
  "visual": {
    "background": {
      "school": "images/school.jpg"
    },
    "portrait": {
      "setsuna": "images/setsuna.png"
    }
  }
}
```

`portrait` 是否进入 state、如何布局、是否支持多角色同屏需要另行设计；第一版只实现全局背景图。

## 测试范围

- game card schema 接受 `visual.background` 资源表并拒绝非法路径
- state schema enum 默认值能初始化 `gameState.visual.background`
- state action 能更新 `visual.background`
- IPC 拒绝路径穿越和非图片扩展名
- 前端在 key 变化时解析背景资源，并在正文开始流式输出时展示本轮背景
- 切换游戏卡或 session 时清理或恢复正确背景
- 游戏卡背景缺失时回落到用户设置背景
