# State 机制设计文档

## 概述
State 是 AI Roleplay Game 的变量系统。平台提供变量定义、引用、修改、LLM 补丁解析、校验、持久化和调试能力；变量业务含义由游戏卡开发者决定。

原则：
- state 是事实源，messages 是叙事记录，prompt 是投影
- 平台不预设 `player`、`npc`、`quest` 等结构
- LLM 可以驱动变量变化，但必须通过可解析、可校验、可追踪的补丁协议
- 哪些变量呈现给 LLM 由游戏卡规则决定
- state 跟聊天存档绑定，不跟 active game card 绑定

## 变量定义
游戏卡通过 `state.schema` 定义静态变量：
```json
{
  "state": {
    "schema": {
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
  }
}
```
第一版字段：
- `type`: `string` / `number` / `boolean` / `object` / `array` / `enum`
- `default`: 新聊天初始化值
- `min` / `max`: number 范围
- `values`: enum 可选值
- `onInvalid`: `error` 或 `clamp`
- `description`: 给作者和 debug UI 使用
- `llmRead` / `llmWrite`: 是否允许 LLM 读写
- `uiVisible` / `userEditable`: 是否展示或允许用户编辑

权限字段只用于校验，不代表自动注入 prompt。

## 动态变量
AI 剧情会产生未预设的人物、地点、线索、记忆和 flag，因此 state 不能只有静态变量。游戏卡通过 `state.dynamic` 声明可运行时创建的命名空间：
```json
{
  "state": {
    "dynamic": {
      "memory.*": {
        "type": "string",
        "maxLength": 500,
        "llmRead": true,
        "llmWrite": true,
        "uiVisible": true
      },
      "npc.*.notes": {
        "type": "array",
        "itemType": "string",
        "maxItems": 20,
        "llmWrite": true
      },
      "flags.*": {
        "type": "boolean",
        "llmWrite": true
      }
    }
  }
}
```
未被 `schema` 或 `dynamic` 覆盖的 path 默认不可创建、不可写入。动态变量可删除；静态变量默认不可删除，只能修改或恢复默认值。

## 存储与路径
schema 使用点路径声明，运行时 state 保存为嵌套 JSON：
```json
{
  "player": { "hp": 80 },
  "route": "none",
  "memory": {
    "old_man_warning": "老人警告玩家不要在午夜进入钟楼"
  }
}
```
平台提供 `getState`、`setState`、`hasState`、`deleteState`。第一版 path 只支持点路径；数组元素不使用 `inventory[0]` 语法，由 `push` / `remove` 操作处理。

## 初始化与迁移
新聊天：
```txt
card.state.schema.default -> session.gameState
```
继续聊天：
```txt
saved session.gameState -> ensureStateDefaults(card, savedState)
```
`ensureStateDefaults` 只补缺失变量，不覆盖已有变量，不删除废弃变量。复杂迁移系统后置。

## LLM 状态补丁
LLM 不直接写入持久化 state，而是在回复中输出隐藏状态补丁：
```txt
<state_patch>
[
  { "op": "set", "path": "player.hp", "value": 82, "reason": "治疗成功" },
  { "op": "inc", "path": "npc.alice.affection", "value": 3 },
  { "op": "push", "path": "inventory", "value": "silver_key" }
]
</state_patch>
```
`after_response` 阶段通过 action 提取并应用：
```json
{
  "type": "state.apply_patch",
  "from": "last_assistant",
  "block": "state_patch",
  "removeSourceBlock": true
}
```
流程：
```txt
assistant content -> extract block -> parse JSON -> validate op/path/permission/type/range -> apply patch -> remove source block -> record trace
```
解析或校验失败不应中断聊天，记录 warning 并跳过非法补丁。

## 状态修改操作
平台内置声明式 mutation action，LLM 补丁和游戏卡规则复用同一套语义：

| op | 效果 |
|---|---|
| `set` | 设置变量 |
| `inc` | number 增减 |
| `toggle` | boolean 取反 |
| `push` | array 追加 |
| `remove` | array 删除指定值 |
| `merge` | object 浅合并 |
| `delete` | 删除动态变量 |

游戏卡规则中也可以直接使用：
```json
{ "type": "state.inc", "path": "player.hp", "by": -10 }
```
所有修改统一经过 schema / dynamic 校验，并生成 state diff。

## 变量引用
Content 描述符支持读取 state：
```txt
{{state:player.hp}}
{{state:route}}
{{state_json:memory}}
{{state_write_schema}}
```
示例：
```json
{
  "type": "insert",
  "role": "system",
  "content": "当前 HP：{{state:player.hp}}\n可写状态：{{state_write_schema}}",
  "ttl": 1,
  "_meta": { "visibility": "llm_only" }
}
```
缺失变量默认渲染为空字符串，并在 trace 中记录 warning。是否把变量呈现给 LLM 由规则显式决定。

## State 条件
`when.state` 支持基于变量触发规则：
```json
{
  "when": {
    "phase": "pre_send",
    "state": {
      "player.hp": { "lte": 20 },
      "flags.met_boss": true,
      "inventory": { "contains": "silver_key" }
    }
  }
}
```
第一版支持 `eq`、`gt`、`gte`、`lt`、`lte`、`in`、`nin`、`contains`、`exists`、`regex`。多 key 默认 AND。

## 持久化与 Trace
state 随聊天历史保存：
```json
{
  "id": "chat-id",
  "gameCard": { "id": "card-id", "version": "1.0.0" },
  "messages": [],
  "gameState": {}
}
```
保存时机：
```txt
pre_send decayTTL -> pre_send rules -> after_response rules -> save messages + gameState
```
messages 和 gameState 必须一起保存，避免剧情记录与变量状态不一致。每次 state 读取失败、补丁失败或修改成功都记录 trace，至少包含 phase、rule/action 位置、变更 diff、校验错误和 LLM patch reason。
