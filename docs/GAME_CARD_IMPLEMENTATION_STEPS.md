# 游戏卡机制实现步骤

本文档描述在当前 Electron + React 聊天应用中落地游戏卡机制的推荐顺序。协议细节见 `docs/GAME_CARD_DESIGN.md`。

## 目标

实现一套可测试、可调试、可逐步扩展的游戏卡 runtime，使聊天消息在发送给 LLM 前后可以被游戏卡规则变换。

核心链路：

```txt
用户发送
  -> applyGameCard(pre_send)
  -> adaptToProtocol
  -> sendChatRequest
  -> append assistant
  -> applyGameCard(after_response)
  -> decayTTL
  -> display + save
```

## 分步实现

### 1. 定义 Schema 和基础类型

新增 `game-card.schema.json`，用于校验游戏卡结构。

第一版覆盖：

- `version` / `id` / `name` / `description` / `author`
- `state`
- `rules`
- `when`
- `then`
- `predicate`
- `content`

同时明确内部消息允许保存：

- `role`
- `content`
- `thinking`
- `_meta`
- `ttl`

### 2. 实现纯 runtime

新增游戏卡 runtime 模块，建议目录：

```txt
src/gameCard/
  engine.js
  predicate.js
  actions.js
  contentResolver.js
  ttl.js
  validateGameCard.js
```

核心函数：

```js
applyGameCard({ card, phase, messages, state, event })
```

返回：

```js
{
  messages,
  state,
  trace
}
```

这一阶段只实现纯函数，不接 UI、不接 API、不读写文件。

### 3. 实现 Predicate 和基础 Action

先支持最小闭环：

- `when.phase`
- `when.length`
- `when.last`
- `predicate.role`
- `predicate.content.contains`
- `predicate.content.regex`
- `predicate.index`
- `insert`
- `remove`
- `replace`

实现后补单元测试，确保规则执行顺序、匹配逻辑和消息变换稳定。

### 4. 实现 TTL 和 Debug Trace

TTL 作为独立步骤处理：

- `ttl: -1` 或无 `ttl` 表示永久
- `ttl > 0` 每轮完成后衰减
- 衰减到 `0` 后移除

Debug trace 至少记录：

- 执行阶段
- 命中的 rule
- 执行的 action
- messages/state 变更摘要
- 错误信息

### 5. 接入发送链路

在用户消息进入 API 请求前执行：

```txt
newMessages -> applyGameCard(pre_send) -> sendChatRequest
```

注意区分：

- 运行时消息：包含 `system`、`_meta`、`ttl`
- 展示消息：只显示用户可见内容

建议通过 `_meta.visibility` 控制展示：

```js
visibility: "llm_only" | "user_visible" | "debug_only"
```

### 6. 接入回复链路

LLM 回复完成后，先追加 assistant 消息，再执行：

```txt
messagesWithAssistant -> applyGameCard(after_response) -> decayTTL -> save
```

`after_response` 可用于：

- 清洗模型回复
- 追加旁白消息
- 更新游戏状态
- 生成下一轮临时提示

### 7. 实现协议适配

新增协议适配函数：

```js
adaptMessagesToProtocol(messages, protocol)
```

OpenAI：

- 保留 `system` 消息在 `messages` 中

Anthropic：

- 提取 `system` 消息
- 拼接为顶层 `system`
- `messages` 中只保留非 `system` 消息

协议适配应放在 API 请求前，不应混入游戏卡 runtime。

### 8. 修改历史保存

当前聊天历史保存只保留 `role`、`content`、`thinking`。接入游戏卡后需要保留：

- `_meta`
- `ttl`
- 必要的游戏状态引用或快照

避免规则生成的运行时消息在重启后丢失上下文。

### 9. 实现游戏卡持久化

新增 IPC 能力：

```js
getGameCards()
getGameCard(id)
saveGameCard(card)
setActiveGameCard(id)
getActiveGameCard()
```

推荐保存位置：

```txt
userData/game-cards/
  active.json
  cards/
    <card-id>.json
```

如果支持卡包目录，`file_content` 只能读取游戏卡目录内部文件。

### 10. 实现 Content 描述符

按设计文档支持：

- `{{original_content}}`
- `{{raw_string:文本}}`
- `{{file_content:path}}`
- `regex_replace`
- `regex_extract`
- `+` 拼接

文件读取必须限制在游戏卡目录内，禁止通过 `../` 访问外部路径。

### 11. 实现 exec

`exec` 最后实现，并默认按受限纯函数处理。

脚本只能访问运行时传入的上下文：

```js
{ messages, state, config, event, utils }
```

返回值固定：

```js
{ messages?, state?, effects? }
```

必须包含：

- 执行超时
- 错误捕获
- 返回值校验
- debug trace
- 禁止 Node.js / Electron / DOM / 网络 / 文件系统访问

### 12. 增加基础 UI

第一版 UI 只做管理能力：

- 导入游戏卡 JSON
- 启用 / 禁用当前游戏卡
- 查看校验错误
- 查看当前游戏状态
- 查看 debug trace

可视化规则编辑器可以后置。

## 推荐里程碑

### M1: Runtime MVP

- Schema
- `applyGameCard`
- Predicate 基础能力
- `insert` / `remove` / `replace`
- 单元测试

### M2: 聊天链路接入

- `pre_send`
- `after_response`
- TTL
- 协议适配
- 历史保存字段扩展

### M3: 游戏卡管理

- IPC 持久化
- 导入和启用
- 校验错误展示
- debug trace 展示

### M4: 扩展能力

- `file_content`
- 完整 Content 描述符
- `exec`
- 游戏状态面板

## 实现原则

- 先做纯 runtime，再接 UI 和 IPC
- 先支持声明式规则，再实现 `exec`
- runtime 不直接依赖 Electron、React 或 API 协议
- API 协议适配和游戏卡规则执行分离
- 每一步都保留 debug trace，方便作者调试游戏卡
