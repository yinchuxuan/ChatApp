# 游戏卡测试计划

## 目标

游戏卡测试的目标是保证规则运行时、聊天链路、协议适配、持久化和 UI 可见性在多轮对话中稳定工作。

测试策略：

- 纯逻辑优先用单元测试覆盖，保证失败定位精确。
- 跨模块契约用集成测试覆盖，验证 IPC、文件系统和保存格式。
- 关键用户路径用 E2E 覆盖，避免把所有边界都堆到 E2E。
- 新增游戏卡能力时必须补对应测试，不删除或削弱已有测试。

## 测试分层

### 1. 单元测试

目录：`test/gameCard/**`

覆盖范围：

- Schema 校验
- `applyGameCard`
- `when` 条件
- predicate 匹配
- `insert` / `remove` / `replace`
- Content 描述符
- TTL 衰减
- Debug trace
- 协议适配
- exec 运行时
- send pipeline 纯函数部分

优先补充场景：

- `when.phase` 与 `length`、`last`、`any`、`all` 同时存在时按 AND 语义匹配。
- 空消息、单消息、多消息下的 `index: 0` 和 `index: "last"`。
- `role`、`content.contains`、`content.regex`、`in`、`nin`、`not`、`or`、多 key 隐式 AND。
- `_meta.source`、`_meta.visibility` 等嵌套字段匹配。
- 无效 regex 不应中断整轮运行，应进入 trace errors。
- 同一 rule 内多个 action 按顺序执行。
- 多个命中 rule 按配置顺序串行执行。
- `remove` 删除多条消息时不受索引偏移影响。
- `replace` 单独修改 `content`、`ttl`、`_meta` 时不误清空其他字段。
- `ttl: -1`、无 `ttl`、`ttl > 0`、非法 ttl 的衰减行为。
- `raw_string` 转义、`original_content`、`regex_replace`、拼接表达式。
- `file_content` 正常读取、文件不存在、缺少 card base dir、路径越界。
- exec 只返回 `messages`、只返回 `state`、返回非法结构、抛错、超时。
- exec 无法访问 Node、Electron、DOM、网络、文件系统 API。
- trace 记录阶段、命中 rule、执行 action、错误和消息变更摘要。

### 2. 集成测试

目录：`test/integration/**`、`test/ipc/**`

覆盖范围：

- 游戏卡保存、读取、列表、启用、停用
- 导入游戏卡 JSON
- active card 持久化
- card 目录内资产读取
- 越界路径拒绝
- 聊天历史保存字段
- IPC 错误结构

优先补充场景：

- 导入成功后自动启用，并可通过 `getActiveGameCard` 读取。
- 导入取消不改变当前 active card。
- 非法 card id、非法 JSON、schema 校验失败返回稳定错误。
- `file_content` 只能读取游戏卡目录内部文件。
- `../`、绝对路径、符号链接逃逸均被拒绝。
- 聊天历史保留 `_meta`、`ttl`、`thinking`。
- 无 active card 时，聊天链路退化为普通消息发送。
- 重启后 active card 和必要运行时状态仍可恢复。

### 3. 组件测试

目录：`test/components/**`

覆盖范围：

- 游戏卡标题控件
- 聊天输入发送链路
- 消息历史展示
- 游戏卡错误展示
- UI 可见性过滤

优先补充场景：

- 未加载游戏卡时显示空状态。
- 导入游戏卡后标题显示 active card 名称。
- 导入失败时显示错误且不影响当前聊天。
- `llm_only` 和 `debug_only` 消息不显示在聊天历史中。
- `user_visible` 消息正常显示。
- 游戏卡运行失败后输入框和发送按钮状态恢复。
- after_response 清洗后的 assistant 内容被展示和保存。

### 4. E2E 测试

目录：`test/e2e/**`

E2E 只覆盖高价值用户路径：

- 无游戏卡启动，普通聊天可用。
- 导入并启用游戏卡后，标题显示 active card。
- 第一轮 `pre_send` 注入 system，并且 UI 不泄露 `llm_only` 内容。
- 两轮对话中 `after_response` 插入临时消息，TTL 正确衰减并移除。
- 停用游戏卡后，后续消息不再被规则改写。
- 重启应用后 active card 和聊天历史仍正确。
- OpenAI 协议保留 `system` messages。
- Anthropic 协议提取并合并顶层 `system`。
- exec 更新 state 并跨轮生效。
- file_content 正常读取卡目录文件。
- file_content 越界路径显示错误，不泄露敏感内容。

## 回归测试命令

修改 runtime、predicate、action、content、ttl、exec 时：

```bash
npx jest test/gameCard
```

修改 IPC、持久化、文件读取时：

```bash
npm run test:integration -- gameCard
```

修改聊天发送或回复链路时：

```bash
npx jest test/gameCard test/components/ChatInputArea.gameCard.test.js
npm run test:e2e -- --grep "pre_send|after_response|multi-turn|game card"
```

修改协议适配时：

```bash
npx jest test/gameCard/gameCardProtocolAdapter.test.js test/components/apiClient.protocolAdapter.test.js
npm run test:e2e -- --grep "protocol|Anthropic|OpenAI"
```

发布前完整验证：

```bash
npm run lint
npm test
```

## 优先级

P0：

- Runtime 纯函数
- Predicate 和 action 正确性
- TTL
- 协议适配
- send pipeline
- 聊天历史保存字段
- active card 持久化

P1：

- file_content 安全
- exec sandbox
- trace 错误路径
- UI 可见性过滤
- 导入和停用流程

P2：

- 复杂规则组合
- 真实 API E2E
- debug trace 展示体验
- 大型游戏卡性能回归

## 新增测试约定

- 单个测试文件不超过 200 行，超过时按主题拆分。
- 优先新增窄范围单元测试，再补集成或 E2E。
- E2E 不测试所有边界，只测试真实用户路径。
- 测试名称应描述行为，不描述实现细节。
- 不使用固定随机结果测试 exec，可断言范围和状态变化。
- 涉及真实 API 的 E2E 必须可通过环境变量跳过。
