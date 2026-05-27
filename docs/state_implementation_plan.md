# State 实现计划

## 目标

实现游戏卡 State 第一版闭环：state 属于聊天 session，游戏卡通过外置 schema 文件声明关键字段；每个阶段先处理 state，再执行 rules。

第一版不做完整 JSON Schema、复杂迁移、数组索引路径、LLM 任意写 state、状态编辑 UI。

## 设计约定

游戏卡引用 schema 文件：

```json
{
  "state": {
    "schemaFile": "state/schema.json"
  }
}
```

schema 文件支持直接 map 或包装格式：

```json
{
  "schema": {
    "player.hp": {
      "type": "number",
      "default": 100,
      "min": 0,
      "max": 100
    }
  }
}
```

`schemaFile` 必须是相对路径，并限制在游戏卡目录内。运行时 state 保存为普通嵌套 JSON：

```json
{
  "player": {
    "hp": 80
  }
}
```

聊天历史新格式：

```json
{
  "messages": [],
  "gameState": {}
}
```

旧数组格式继续按 messages 读取，`gameState` 视为空对象；新保存统一写对象格式。

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

## 最小实施步骤

### 1. State 路径工具

范围：新增 `getStateValue`、`setStateValue`、`hasStateValue`、`cloneState`，只支持点路径。

验证：单元测试覆盖嵌套读写、缺失路径、非对象父节点处理。完成后不影响现有游戏卡测试。

### 2. Schema 解析与默认值

范围：新增 `normalizeStateSchema`、`ensureStateDefaults`，支持直接 map 和 `{ "schema": ... }`。

验证：单元测试覆盖默认值补齐、不覆盖已有值、enum/number 基本校验、`onInvalid: "clamp"`。完成后可独立用纯函数验证。

### 3. 外置 Schema 文件加载

范围：扩展 game card 文件预加载，读取 `card.state.schemaFile`，复用现有安全路径规则。

验证：pipeline 测试覆盖成功读取、缺失文件报错、绝对路径/越界路径被拒绝。完成后 active card 仍可无 state 运行。

### 4. Pipeline 先处理 State

范围：在 `prepareInitMessages`、`preparePreSendMessages`、`prepareAfterResponseMessages` 中先执行 schema 默认值补齐，再调用 `applyGameCard`。

验证：测试确认 rule 执行前 state 已包含默认值；无 schema 时 state 原样透传。完成后 trace 或返回值能体现 state 变化。

### 5. 聊天历史持久化

范围：`get-chat-history` 返回 `{ messages, gameState }`；`save-chat-history` 接收并保存 `gameState`。兼容旧数组格式。

验证：IPC 测试覆盖读取旧数组、新对象、保存新对象、保留 message runtime 字段。完成后 messages 和 gameState 同文件保存。

### 6. React 状态接入

范围：`ChatPanel` 持有 `gameState`，初始化、发送、重试、保存时与 pipeline 返回值同步。

验证：组件测试覆盖加载 state、init 后保存 state、发送后保存 state。完成后前端不会只保存 messages。

### 7. Content 读取 State

范围：新增 `{{state:path}}` 和 `{{state_json:path}}`，从 `options.state` 读取。

验证：content resolver 测试覆盖标量、object/array JSON、缺失路径为空。完成后游戏卡可把 state 注入 prompt。

### 8. `when.state`

范围：扩展 `matchesWhen` 支持 state predicate，第一版支持 `eq`、`gt`、`gte`、`lt`、`lte`、`in`、`nin`、`contains`、`exists`、`regex`。

验证：predicate/engine 测试覆盖匹配、未匹配、多 key AND。完成后规则可按 state 条件触发。

### 9. 文档与示例

范围：更新 `STATE_DESIGN.md`、`game_card_design.md` 和一个示例游戏卡，展示外置 schema、state content、`when.state`。

验证：示例导入后能通过现有 game card 校验；文档说明 state 先于 rules 的顺序。

## 后续阶段

第二阶段实现 mutation action：`state.set`、`state.inc`、`state.toggle`、`state.push`、`state.remove`、`state.merge`、`state.delete`。

第三阶段实现 `state.dynamic`、LLM `<state_patch>`、state diff trace 和 debug UI。

## 总体验收

- 游戏卡可引用外置 schema 文件
- 新会话自动生成默认 `gameState`
- 旧数组聊天历史仍可读取
- 保存文件包含 `messages` 和 `gameState`
- `init` / `pre_send` / `after_response` rules 执行前 state 已补齐
- `{{state:path}}`、`{{state_json:path}}`、`when.state` 可用
- 每个步骤都有对应测试
