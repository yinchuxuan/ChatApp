# State 机制设计文档

## 概述

State 是 AI Roleplay Game 的变量系统。平台提供变量定义、引用、修改、校验、持久化和调试能力；变量业务含义由游戏卡开发者决定。

原则：

- state 是事实源，messages 是叙事记录，prompt 是投影
- state 是聊天 session 的数据，不是游戏卡文件自身的数据
- 游戏卡不预设 `player`、`npc`、`quest` 等业务结构
- 游戏卡通过 schema 描述关键字段，但运行时 state 仍是普通 JSON
- state 处理必须发生在游戏卡 rules 之前
- 哪些变量呈现给 LLM 由游戏卡规则显式决定

## 游戏卡引用 Schema

游戏卡不内联完整 schema，而是引用同目录下的 schema 文件：

```json
{
  "stateSchema": "state/schema.json"
}
```

`stateSchema` 必须是相对路径，读取时限制在游戏卡目录内。

schema 文件支持直接 map：

```json
{
  "player.hp": {
    "type": "number",
    "default": 100,
    "min": 0,
    "max": 100,
    "onInvalid": "clamp",
    "llmRead": true,
    "llmWrite": true,
    "uiVisible": true
  },
  "route": {
    "type": "enum",
    "values": ["none", "alice", "bad_end"],
    "default": "none"
  }
}
```

也支持包装格式：

```json
{
  "schema": {
    "player.hp": {
      "type": "number",
      "default": 100
    }
  }
}
```

## Schema 字段

第一版支持 `type`、`default`、`min`、`max`、`values`、`onInvalid`、`description`、`llmRead`、`llmWrite`、`uiVisible`、`userEditable`。

`type` 支持 `string` / `number` / `boolean` / `object` / `array` / `enum`。`onInvalid` 支持 `error` 或 `clamp`。权限字段只用于校验和后续 UI，不代表自动注入 prompt。

## 存储与路径

schema 使用点路径声明，运行时 state 保存为嵌套 JSON：

```json
{
  "player": {
    "hp": 80
  },
  "route": "none",
  "memory": {
    "old_man_warning": "老人警告玩家不要午夜进入钟楼"
  }
}
```

第一版 path 只支持点路径；数组元素不使用 `inventory[0]` 语法。

平台提供基础工具：`getStateValue`、`setStateValue`、`hasStateValue`、`deleteStateValue`、`ensureStateDefaults`。

## 初始化与默认值

新聊天：

```txt
state schema defaults -> session.gameState
```

继续聊天：

```txt
saved session.gameState -> ensureStateDefaults(schema, savedState)
```

`ensureStateDefaults` 只补缺失变量，不覆盖已有变量，不删除废弃变量。复杂迁移系统后置。

## 执行顺序

state 处理必须在 rules 之前。

加载会话：

```txt
read messages.json
  -> load active card and state schema
  -> ensureStateDefaults(schema, savedGameState)
  -> run init rules if messages is empty
  -> save messages + gameState if changed
```

用户发送：

```txt
append user message
  -> load state schema
  -> ensureStateDefaults(schema, gameState)
  -> decayTTL
  -> run pre_send rules
  -> send to LLM
  -> append assistant message
  -> ensureStateDefaults(schema, gameState)
  -> run after_response rules
  -> save messages + gameState
```

这保证 `when.state`、`{{state:path}}` 和后续 state action 都基于补齐后的合法状态。

## 变量引用

Content 描述符支持读取 state：

```txt
{{state:player.hp}}
{{state:route}}
{{state_json:memory}}
```

规则：

- `{{state:path}}` 返回标量的字符串表示
- object / array 使用 `{{state_json:path}}`
- 缺失变量默认渲染为空字符串，并在 trace 中记录 warning

是否把变量呈现给 LLM 由规则显式决定。

## State 条件

`when.state` 支持基于变量触发规则：

```json
{
  "when": {
    "phase": "pre_send",
    "state": {
      "player.hp": { "lte": 20 },
      "flags.met_boss": true
    }
  }
}
```

第一版支持 `eq`、`gt`、`gte`、`lt`、`lte`、`in`、`nin`、`contains`、`exists`、`regex`。多 key 默认 AND。

## State 修改
第二阶段支持 `state.set`、`state.delete`、`state.append`、`state.remove`、`state.roll`、`state.randomInt`、`state.advance`。`set` 写入 JSON 值；`delete` 删除变量；`append` 追加数组；`remove` 移除深相等值；`roll` 掷骰；`randomInt` 写入闭区间整数；`advance` 将 enum schema 路径推进到下一个枚举值，末尾保持不变。它们不修改 messages；命中 schema 必须校验，`onInvalid: "clamp"` 对 number 生效；未命中 schema 允许写入；`llmWrite` 留给后续 LLM patch。

## 持久化

state 随聊天历史保存：

```json
{
  "messages": [],
  "gameState": {}
}
```

兼容旧格式：

- 旧文件如果是数组，按 `messages` 读取，`gameState` 为空对象
- 新保存统一写对象格式
- messages 和 gameState 必须一起保存，避免剧情记录与变量状态不一致

## 后续扩展

动态变量用于开放运行时命名空间，例如 `memory.*`、`flags.*`、`npc.*.notes`。未被 schema 或 dynamic 覆盖的 path 默认不可由 LLM 创建或写入。后续可按实际需求补充 `inc`、`toggle`、`merge` 等便利 action。

LLM 不直接写持久化 state，而是在回复中输出隐藏 `<state_patch>`，由 `after_response` action 解析、校验、应用并移除源 block。解析或校验失败不应中断聊天，只记录 warning 并跳过非法补丁。复杂状态逻辑在此之前继续使用 `exec`。

每次 state 读取失败、补丁失败或修改成功都应记录 trace，至少包含 phase、rule/action 位置、变更 diff、校验错误和 LLM patch reason。
