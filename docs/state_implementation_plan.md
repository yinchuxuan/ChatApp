# State 第二阶段实现计划

## 目标

第二阶段实现最小声明式 mutation action 集合：`state.set`、`state.delete`、`state.append`、`state.remove`、`state.roll`、`state.randomInt`。

第一阶段已完成的能力作为基线：外置 state schema、默认值补齐、聊天历史持久化、React `gameState` 接入、`{{state:path}}` / `{{state_json:path}}`、`when.state`。

第二阶段不做 `state.inc`、`state.toggle`、`state.merge`、`state.dynamic`、LLM `<state_patch>`、state debug UI、复杂迁移、数组索引路径、动态文件路径。

## Action 语法

新增 action 类型：

```json
{ "type": "state.set", "path": "route", "value": "alice" }
{ "type": "state.set", "path": "player.hp", "value": 80 }
{ "type": "state.set", "path": "flags.metBoss", "value": true }
{ "type": "state.set", "path": "inventory", "value": [{ "id": "key" }] }
{ "type": "state.delete", "path": "temp.lastRoll" }
{ "type": "state.append", "path": "inventory", "value": { "id": "key" } }
{ "type": "state.remove", "path": "inventory", "value": { "id": "key" } }
{ "type": "state.roll", "path": "temp.roll", "dice": "1d6" }
{ "type": "state.randomInt", "path": "temp.pick", "min": 1, "max": 6 }
```

`path` 继续只支持点路径，不支持 `items[0]`。`value` 必须是 JSON 值。随机 action 写入 number。这些 action 不修改 messages。

## 执行顺序

state mutation action 复用现有 rule/action pipeline：

```txt
ensureStateDefaults(schema, state)
  -> run rules in declaration order
  -> run actions in declaration order
  -> each action receives previous action's state
  -> save messages + gameState
```

同一条 rule 内，前一个 state action 的结果必须能被后续 action、`{{state:path}}` 和后续 rule 的 `when.state` 读取。

## `state.set` 语义

`state.set` 将 `value` 写入 `path`。

- 父节点缺失时创建 object
- 父节点为非 object 时沿用现有 `setStateValue` 行为替换为 object
- 写入 array/object 时必须深拷贝，不能复用 action 上的引用
- path 缺失或非法时 action 失败且不修改 state

## `state.delete` 语义

`state.delete` 删除 `path`。目标缺失时 no-op；path 缺失或非法时 action 失败。删除后不自动清理空父节点；删除带 default 的 schema path 后，下次 `ensureStateDefaults` 会重新补回默认值。

## 数组语义

`state.append` 向数组末尾追加 `value`。目标缺失时创建数组；目标存在但不是数组时 action 失败且不修改 state。

`state.remove` 从数组中移除与 `value` 深相等的元素。目标缺失时 no-op；目标存在但不是数组时 action 失败且不修改 state。第二阶段只支持按 value 移除，不做 predicate。

复杂修改继续使用现有 `exec`，例如数值增减、条件删除和对象合并。后续阶段确认需求后再补便利 action。

## 随机语义

`state.roll` 接收 `dice` 字符串，支持 `d6`、`1d6`、`2d10` 形式，写入掷骰总和；非法表达式 action 失败且不修改 state。

`state.randomInt` 接收整数 `min`、`max`，写入闭区间 `[min, max]` 的随机整数；`min > max` 或参数不是整数时 action 失败且不修改 state。

## Schema 校验

第二阶段采用保守集成：

- path 如果命中 schema，修改后必须通过现有 schema 校验
- `onInvalid: "clamp"` 对 number 写入结果生效，包括 `state.set`、`state.roll`、`state.randomInt`
- schema 校验失败时跳过该 action，不写入非法值
- path 未命中 schema 时允许写入，保持与现有 `exec` 能力一致
- `llmWrite` 不约束游戏卡 action；它留给后续 LLM patch 使用

如果一个 action 会产生非法 state，trace 记录失败原因，聊天流程继续。

## Trace

state action trace 沿用现有 action trace 结构：

```js
{
  type: "state.set",
  applied: true,
  matched: 1,
  summary: {
    messages: { before: 2, after: 2, inserted: 0, removed: 0, replaced: 0 },
    state: { changedKeys: ["player.hp"] }
  }
}
```

失败时 `applied: false`，并记录 `reason`。

## 最小实施步骤

### 1. 补齐 State 路径工具

范围：在 `statePaths` 增加 `deleteStateValue`，保持不可变更新和点路径限制。

验证：覆盖删除嵌套值、缺失路径 no-op、非法 path no-op、不修改原 state。

### 2. 新增 State Action Runtime

范围：新增 `src/gameCard/stateActions.js`，实现 `applyStateAction(state, action, options)`。第二阶段处理 `state.set`、`state.delete`、`state.append`、`state.remove`、`state.roll`、`state.randomInt`，`actions.js` 只做分派。

验证：单元测试覆盖变量创建、赋值、删除、数组 append/remove、roll、randomInt、非法 path、不可变性、失败不修改、trace。

### 3. 接入 Game Card Pipeline

范围：`applyAction` 识别上述 state action，messages 原样透传，state 使用 state action 返回值。action 顺序必须与 `exec` 一致。

验证：engine 测试覆盖 `state.set` 后接 `insert` 读取 `{{state:path}}`，以及后一条 rule 的 `when.state` 基于新 state 匹配。

### 4. Schema-Aware 修改校验

范围：复用现有 schema normalize/default validation 能力，给 state action 的结果做 path 级校验。必要时拆出可复用的 value validator。

验证：覆盖 enum 拒绝、number min/max 拒绝、`onInvalid: "clamp"`、数组类型校验、未声明 path 允许写入。

### 5. 拆分 Action 校验

范围：`validatePredicates.js` 已接近 200 行，新增 `validateStateActions.js`。`validateAction` 只负责根据 action type 分派。

验证：validator 测试覆盖合法 state action、缺失 path、非法 path、缺失 value、非法 dice/range、未知 `state.*` 类型。

### 6. 更新 JSON Schema

范围：让 `game-card.schema.json` 支持第二阶段 state action。该文件也接近 200 行，若直接添加会超限，应拆分或压缩定义，确保所有文件不超过 200 行。

验证：schema 测试覆盖新增 state action 可通过，错误字段会失败。

### 7. 文档与示例

范围：更新 `STATE_DESIGN.md`、`game_card/game_card_actions.md` 和一个示例游戏卡。示例优先用 state action 替换可直接表达的 `exec`。

验证：示例可通过 game card 校验；文档明确第二阶段 action 范围。

## 测试清单

- `test/gameCard/statePaths.test.js`：新增 delete path 覆盖
- `test/gameCard/stateActions.test.js`：第二阶段 state action 纯函数覆盖
- `test/gameCard/gameCardStateActions.test.js`：pipeline 顺序与 trace 覆盖
- `test/gameCard/gameCardSchema.test.js`：新增 action schema/validator 覆盖
- `test/gameCard/stateSchema.test.js`：path 级 schema 校验复用覆盖

## 验收标准

- 游戏卡可使用 `state.set` 创建/写入 JSON 值
- 游戏卡可使用 `state.delete` 删除变量
- 游戏卡可使用 `state.append` / `state.remove` 修改数组
- 游戏卡可使用 `state.roll` / `state.randomInt` 写入随机 number
- state action 不修改 messages，但能和现有 message action 混排
- 同一 rule 和后续 rule 能读取前序 state action 的结果
- 命中 schema 的修改不会产生非法 state
- 非法 state action 不影响聊天继续执行，并在 trace 中可见
- 所有新增和修改文件不超过 200 行

## 后续阶段

后续按实际需求评估 `state.inc`、`state.toggle`、`state.merge`。第三阶段仍聚焦 `state.dynamic`、LLM `<state_patch>`、state diff trace 增强和 debug UI。
