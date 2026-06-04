# 游戏卡 Audio 设计文档

## 目标

Audio 定义游戏卡可使用的本地音频资源，并通过 `gameState` 控制当前播放内容。

第一版只设计 BGM：游戏卡声明 BGM key 到资源路径的映射，state schema 声明当前 BGM key，现有 state action 修改当前 BGM key，前端播放器监听 `gameState.audio.bgm` 并播放对应资源。

Audio 不进入 LLM prompt，不写入消息正文，也不由 display rules 处理。

## 设计原则

- `card.audio` 是资源表，`gameState.audio` 是当前会话状态。
- BGM 状态跟随 session 保存和加载，切换 session 时恢复。
- 游戏卡规则只修改语义化 key，不直接散落文件路径。
- 音频资源只能来自当前游戏卡目录，禁止路径穿越。
- 播放器是 UI 运行时能力，不改变 messages、retry base 或 LLM 请求。

## 游戏卡配置

顶层 `audio` 使用按类型分组的资源表：

```json
{
  "audio": {
    "bgm": {
      "intro": "audio/intro.mp3",
      "ensemble": "audio/ensemble.mp3",
      "quiet": "audio/quiet.mp3"
    }
  }
}
```

路径必须是游戏卡目录内的相对路径，不允许以 `/`、`\` 开头，不允许 `..` 路径段，建议只允许 `.mp3`、`.ogg`、`.wav`、`.m4a`。

## State Schema

当前 BGM key 由 `gameState.audio.bgm` 表示：

```json
{
  "audio.bgm": {
    "type": "enum",
    "values": ["intro", "ensemble", "quiet"],
    "default": "intro",
    "description": "当前播放的 BGM key"
  }
}
```

schema 中的 enum values 应与 `card.audio.bgm` 的 key 对齐。

运行时 state 保存为嵌套 JSON：

```json
{
  "audio": {
    "bgm": "intro"
  }
}
```

## 规则更新

游戏卡继续使用现有 state action：

```json
{
  "type": "state",
  "path": "audio.bgm",
  "op": "set",
  "value": "ensemble"
}
```

语义等价于：

```js
gameState.audio.bgm = "ensemble";
```

示例：进入固定剧情节点时切换 BGM。

```json
{
  "when": {
    "phase": "pre_send",
    "state": {
      "timeline.currentSlot": {
        "eq": "2007.10.21: 16:00 星期日 - 2007.10.21: 18:00 星期日"
      }
    }
  },
  "then": [
    {
      "type": "state",
      "path": "audio.bgm",
      "op": "set",
      "value": "ensemble"
    }
  ]
}
```

## 前端播放器

前端新增 BGM 播放器运行时，输入为：

- active game card
- current `gameState.audio.bgm`
- user playback settings

解析流程：

```txt
gameState.audio.bgm
  -> card.audio.bgm[bgmKey]
  -> getGameCardAudioUrl(relativePath)
  -> audio element load/play
```

播放时机：

- 用户提交消息后立即停止当前 BGM；仅键入输入不停止
- LLM 流式回复期间保持停止
- 流式回复完成并完成 `after_response` 规则后，按最新 `gameState.audio.bgm` 从头加载并播放

行为要求：

- active game card 为空时停止播放
- 当前 key 缺失或资源不存在时停止播放并记录错误
- 切换游戏卡时停止旧音频
- 切换 session 后按恢复出的 `gameState.audio.bgm` 播放
- 相同 key 不重复加载
- 音频循环播放默认开启

浏览器自动播放策略可能要求用户先交互。播放器应提供播放/暂停按钮，不能假设首次加载一定能自动播放。

## 用户设置

用户播放偏好属于应用 UI 设置，不属于剧情状态。`enabled`、`volume`、`muted` 不应写入游戏卡 `state.schema`，也不应随 session 剧情进度变化。

## IPC 与资源安全

渲染进程不直接读取本地文件。preload 应暴露安全接口，例如：

```js
window.electronAPI.getGameCardAudioUrl("audio/intro.mp3");
```

主进程校验当前 active game card 存在、path 是安全相对路径、解析后的绝对路径仍位于当前游戏卡目录内，且扩展名属于允许的音频类型。

返回值应是可供 `<audio>` 加载的安全 URL 或失败结果。

## 与 Display Rules 的关系

Audio 不通过 display rules 实现。

display rules 是 UI-only 文本变换，只作用于消息内容渲染；BGM 是本地运行时状态，来源应是 `gameState.audio.bgm`。这样不会污染历史消息，也不会把音频控制标签发给 LLM。

## 后续扩展

可以在相同结构下扩展其它音频类型：

```json
{
  "audio": {
    "bgm": {
      "intro": "audio/intro.mp3"
    },
    "sfx": {
      "door": "audio/sfx/door.mp3"
    },
    "ambient": {
      "rain": "audio/ambient/rain.ogg"
    }
  }
}
```

对应 state path 可以是 `audio.bgm` 和 `audio.ambient`。

短音效 `sfx` 是否进入 state 需要另行设计；它更像一次性事件，不一定适合保存为持久化状态。

## 测试范围

- game card schema 接受 `audio.bgm` 资源表并拒绝非法路径
- state schema enum 默认值能初始化 `gameState.audio.bgm`
- state action 能更新 `audio.bgm`
- IPC 拒绝路径穿越和非音频扩展名
- 组件在 key 变化时切换音频资源
- 切换游戏卡或 session 时停止或恢复正确 BGM
- 用户输入时停止播放，流式回复完成后按最新 state 播放
