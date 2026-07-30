# 游戏卡 Visual 设计文档

## 目标

Visual 定义游戏卡可使用的本地视觉资源，并通过 `gameState` 控制当前展示内容。

游戏卡声明背景和立绘 key 到资源路径的映射。运行时自动派生隐藏 state schema，现有 state action 可以修改当前背景或立绘 key。前端将单张 `visual.portrait` 透明图片叠加在背景与剧情内容之间。

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
    },
    "portrait": {
      "touma": "images/portraits/touma.png",
      "setsuna": "images/portraits/setsuna.webp"
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

声明 `card.visual.portrait` 后，运行时还会派生 `visual.portrait` 枚举。`values` 为保留值 `none` 加所有立绘 key，默认值为 `none`；`none` 表示不展示立绘，不能用作资源 key。

运行时 state 保存为嵌套 JSON：

```json
{
  "visual": {
    "background": "school",
    "portrait": "none"
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

前端 presentation controller 提供 `updateBackground(card, state)` 和 `updatePortrait(card, state)`。state 更新只改变目标值，不直接改变实际画面。

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
- 平台默认在首个正文 token 到达时调用两个 update 函数；首 token 前失败或取消不会自动切换画面。
- `state_patch` 改变视觉字段时，在普通模式的流游标或分段模式的阅读游标越过该 patch 后立即发布变化。
- `presentation.autoUpdateOnFirstToken: false` 可关闭默认调用；卡片可在 `pre_send` / `after_response` 使用 `visual.updateBackground`、`visual.updatePortrait` 手动发布。
- update 每次读取传入 state 的目标 key；异步资源解析只允许最新的通道请求生效，不维护待发布 visual snapshot。
- 游戏卡背景只覆盖背景图片，不覆盖用户设置的遮罩透明度；透明度仍使用现有 `backgroundOpacity`。

## 资源安全

渲染进程通过 game card platform contract 请求资源 URL：

```js
platform.resources.getImageUrl(card.id, "images/school.jpg");
```

Tauri 受控资源协议校验当前 active game card、相对路径边界、realpath 和图片扩展名。

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

## 立绘状态设置

立绘使用与背景相同的语义 key 模式：

```json
{
  "type": "state.set",
  "path": "visual.portrait",
  "value": "setsuna"
}
```

`visual.portrait` 跟随 session 保存和恢复，不进入 LLM prompt。当前使用单张全屏透明画布、底部对齐，并在背景淡入完成后以较长时长淡入；自定义位置和多角色同屏仍需另行设计。

## 测试范围

- game card schema 接受 `visual.background` 资源表并拒绝非法路径
- game card schema 接受 `visual.portrait` 资源表，拒绝非法路径和保留 key `none`
- state schema enum 默认值能初始化 `gameState.visual.background`
- state schema 默认 `gameState.visual.portrait` 为 `none`，state action 能更新立绘 key
- state action 能更新 `visual.background`
- 资源协议拒绝路径穿越和非图片扩展名
- 前端在 key 变化时解析背景资源，并在正文开始流式输出时展示本轮背景
- 前端在 key 变化时解析立绘资源，并在正文开始流式输出时叠加单张透明立绘
- 切换游戏卡或 session 时清理或恢复正确背景
- 游戏卡背景缺失时回落到用户设置背景
