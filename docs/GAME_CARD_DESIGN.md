# 游戏卡（Game Card）设计文档

## 概述

游戏卡是纯 JSON 配置文件，定义 AI roleplay 游戏的运行时规则。核心职责：在消息发送到 LLM 前后，对 `messages` 数组进行声明式变换。

> 游戏卡 ≠ 角色卡。角色卡定义"角色是谁"；游戏卡定义"游戏怎么玩"。一张游戏卡可以引用多张角色卡（NPC），但游戏卡本身定义的是游戏逻辑。

## 消息格式（内部）

```js
{
  role: "user" | "assistant" | "system",
  content: string,
  _thinking?: string,    // UI 内部用
  thinking?: string,     // 持久化
  isError?: boolean,     // UI 内部用
  _meta?: {
    source?: string      // 消息来源标记
  },
  ttl?: number           // 消息剩余存活轮数，-1 表示永久
}
```

`_meta` 和 `ttl` 不会发送给 LLM。

## 消息 TTL

消息可通过 `ttl` 字段控制自动过期。每完成一轮用户对话（发送 + 收到回复），所有有 `ttl` 且 `ttl > 0` 的消息 `ttl -= 1`，减到 0 时从数组中移除。

| ttl 值 | 含义 |
|---|---|
| `-1` | 永久存在（不衰减） |
| `1` | 下一轮对话后移除 |
| `5` | 5 轮对话后移除 |
| 无 `ttl` 字段 | 同 `-1`，永久存在 |

### insert 指定 ttl

```json
{
  "type": "insert",
  "predicate": { "index": 0 },
  "anchor": "before",
  "role": "system",
  "content": "{{file_content:worldbook/rules.md}}",
  "ttl": -1
}
```

`ttl` 不写时默认 `-1`（永久）。

### replace 修改 ttl

```json
{
  "type": "replace",
  "predicate": { "_meta.source": "game_card" },
  "ttl": 2
}
```

将匹配消息的 ttl 设为 2（2 轮后移除）。`content` 和 `ttl` 可独立设置，不写 `ttl` 时不修改目标消息的 ttl 值。

## 协议适配

规则输出的消息数组可能包含 `role: "system"`。在调用 API 前需要协议适配：

```
messages (含 system) → adaptToProtocol → API 请求体
```

- **OpenAI**：原生支持 `role: "system"`，直接透传
- **Anthropic**：提取所有 `role: "system"` 消息，拼接为顶层 `system` 字段

## 规则结构

游戏卡包含一组平铺的规则条目，每条规则由 `when`（触发条件）和 `then`（执行操作）组成：

```json
{
  "rules": [
    { "when": { "phase": "pre_send" }, "then": [ ...操作列表... ] }
  ]
}
```

运行时过滤出 `when` 条件满足的规则，按顺序执行其 `then` 中的操作。上一步输出是下一步输入。

## When（触发条件）

`when` 的本质是：**判断当前阶段的消息数组是否满足触发条件**。

```json
{ "when": { "phase": "pre_send" } }                              // 该阶段每次都执行
{ "when": { "phase": "pre_send", "length": 1 } }                 // 只在第一次发送时
{ "when": { "phase": "pre_send", "length": { "lte": 1 } } }      // 消息数 <= 1 时
{ "when": { "phase": "after_response", "last": { "role": "assistant" } } }  // 最后一条是 assistant 时
{ "when": { "phase": "pre_send", "any": { "content": { "regex": "start_quest" } } } }  // 任意消息包含关键词
```

| 字段 | 类型 | 含义 |
|---|---|---|
| `phase` | string | 必填。`pre_send`（发消息前）或 `after_response`（LLM 返回后） |
| `length` | number 或比较对象 | 消息总数。支持 `gt`/`gte`/`lt`/`lte`/`eq` |
| `last` | predicate | 最后一条消息是否匹配（复用 Predicate 语法） |
| `any` | predicate | 是否有任意消息匹配（复用 Predicate 语法） |
| `all` | predicate | 是否所有消息都匹配（复用 Predicate 语法） |

`last`、`any`、`all` 复用下方 Predicate 定义的匹配语法。不加 `length`/`last`/`any`/`all` 表示无条件，该阶段每次都执行。

### 阶段说明

| 阶段 | 触发时机 | 典型用途 |
|---|---|---|
| `pre_send` | 用户发送消息后、调用 API 前 | 注入 system prompt、替换用户消息前缀 |
| `after_response` | LLM 返回后、显示给用户前 | 清洗 LLM 回复格式、追加旁白消息 |

## Pipeline 执行流程

```
用户发送
  → 过滤 phase=pre_send 且 when 条件满足的规则
  → 按顺序执行 then 中的操作（messages 逐步变换）
  → adaptToProtocol（协议适配）
  → sendChatRequest
  → LLM 返回
  → 过滤 phase=after_response 且 when 条件满足的规则
  → 按顺序执行 then 中的操作
  → 显示 + 保存
```

## 操作类型

### insert — 插入消息

在指定位置插入一条新消息。

```json
{
  "type": "insert",
  "predicate": { "index": 0 },
  "anchor": "before",
  "role": "system",
  "content": "{{file_content:worldbook/rules.md}}"
}
```

- `predicate`：定位锚点消息
- `anchor`：`before`（之前）或 `after`（之后），默认 `before`
- `role`：新消息的 role
- `content`：Content 描述符（见下文）

### remove — 删除消息

删除匹配 predicate 的消息。

```json
{
  "type": "remove",
  "predicate": { "role": "system" }
}
```

从后往前删除，避免索引偏移。

### replace — 替换消息内容

修改匹配消息的 content 字段。

```json
{
  "type": "replace",
  "predicate": { "role": "assistant" },
  "content": "{{original_content}}.regex_replace{pattern:'^```',with:''} + {{file_content:worldbook/rules.md}}"
}
```

### exec — 执行 JS 脚本

兜底操作，用于声明式操作无法覆盖的游戏逻辑。`exec` 不是通用插件能力，而是在受限上下文中执行的纯变换函数。

```json
{
  "type": "exec",
  "source": "const damage = utils.roll('1d6'); state.player.hp = utils.clamp(state.player.hp - damage, 0, 100); return { messages, state };"
}
```

脚本内容按函数体处理，由运行时包装为：

```js
function run(ctx) {
  const { messages, state, config, event, utils } = ctx;
  // source
}
```

运行上下文：

| 字段 | 说明 |
|---|---|
| `messages` | 当前消息数组 |
| `state` | 当前游戏状态 |
| `config` | 游戏卡配置字段，只读 |
| `event` | 当前触发事件，如 `phase`、轮次、当前用户/助手消息 |
| `utils` | 平台提供的安全工具，如 `randomInt`、`roll`、`clamp`、`uuid` |

返回值固定为 `{ messages?, state?, effects? }`，运行时校验后再应用。`effects` 用于表达 UI 或系统侧效果，不允许脚本直接操作 UI。

安全约束：

- 不提供 `require` / `import` / `process` / `window` / `document` / `fetch` / `ipcRenderer` / Node.js / Electron API
- 不允许直接读写文件、访问网络或操作持久化存储
- 执行应有超时、错误捕获、返回值校验和 debug trace

## Predicate（搜索条件）

本质是返回布尔值的匹配函数，声明式 JSON 表达。用于 `replace` / `remove` 定位命中消息，以及 `insert` 定位锚点消息，也用于 `when` 中的 `last`/`any`/`all` 条件。

### 匹配方式

| 语法 | 匹配逻辑 |
|---|---|
| `{ "role": "user" }` | `msg.role === "user"`（精确匹配） |
| `{ "content": { "regex": "^【" } }` | 正则匹配 |
| `{ "content": { "contains": "关键词" } }` | 字符串包含 |
| `{ "role": { "in": ["user", "assistant"] } }` | 集合成员 |
| `{ "role": { "nin": ["system"] } }` | 非集合成员 |
| `{ "index": 0 }` | `i === 0` |
| `{ "index": "last" }` | `i === len - 1` |
| `{ "all": true }` | 所有消息 |
| `{ "exec": "(msg, i, msgs) => ..." }` | JS 函数匹配 |

### 逻辑组合

```json
{ "or": [{ "role": "user" }, { "role": "assistant" }] }
{ "not": { "role": "system" } }
```

多 key 隐式 AND：`{ "role": "user", "_meta.source": "game_card" }` 表示 role 为 user 且 `_meta.source` 为 game_card。

## Content 描述符

描述如何生成一条消息的 content 值。

### 原子内容来源（3 种）

| 来源 | 语法 | 说明 |
|---|---|---|
| 消息原文 | `{{original_content}}` | `replace` 时有值，为被匹配消息的 content；`insert` 时为空字符串 |
| 字符串 | `{{raw_string:文本}}` | 字面量字符串，`\}}` 和 `\\` 需要转义 |
| 外部文件 | `{{file_content:path/to/file.md}}` | 从游戏卡目录相对路径读取文件内容 |

### Transform 函数（2 种）

| 函数 | 参数 | 效果 |
|---|---|---|
| `regex_replace` | `pattern`, `with`, `flags?` | 正则替换 |
| `regex_extract` | `pattern`, `group?` | 提取捕获组 |

### 组合规则

```
expression = chain ("+" chain)*
chain      = source ("." transform)*
```

`.` 绑定优先级高于 `+`。多个 source 各自变换后拼接，不需要括号。

### 示例

```
{{original_content}}.regex_replace{pattern:'^```',with:''}
```

```
{{original_content}}.regex_replace{pattern:'^```json\\n',with:''}.regex_replace{pattern:'\\n```$',with:''}
```

```
{{original_content}} + {{file_content:worldbook/rules.md}}
```

```
{{original_content}}.regex_replace{pattern:'^```',with:''} + {{file_content:worldbook/rules.md}}.regex_replace{pattern:'^#.*\\n',with:''}
```

要加前缀直接拼接：

```
{{raw_string:【回复】}} + {{original_content}}
```

## 完整游戏卡结构

```json
{
  "version": "1.0",
  "id": "uuid",
  "name": "游戏名称",
  "description": "描述",
  "author": "作者",
  "rules": [
    {
      "when": { "phase": "pre_send", "length": 1 },
      "then": [
        {
          "type": "remove",
          "predicate": { "role": "system" }
        },
        {
          "type": "insert",
          "predicate": { "index": 0 },
          "anchor": "before",
          "role": "system",
          "content": "{{file_content:worldbook/rules.md}}"
        }
      ]
    },
    {
      "when": { "phase": "pre_send" },
      "then": [
        {
          "type": "replace",
          "predicate": { "role": "user" },
          "content": "{{raw_string:【玩家】}} + {{original_content}}"
        }
      ]
    },
    {
      "when": { "phase": "after_response" },
      "then": [
        {
          "type": "replace",
          "predicate": { "role": "assistant" },
          "content": "{{original_content}}.regex_replace{pattern:'^```',with:''} + {{file_content:worldbook/rules.md}}"
        },
        {
          "type": "insert",
          "predicate": { "index": "last" },
          "anchor": "after",
          "role": "system",
          "content": "{{raw_string:进入下一阶段}}"
        }
      ]
    }
  ]
}
```
