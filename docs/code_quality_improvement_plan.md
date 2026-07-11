# Code Quality Improvement Plan

## 目标

在不改变现有产品行为和游戏卡协议的前提下，提高代码的可读性、运行时隔离能力、平台可移植性和测试有效性。

本计划不包含新功能、WA2 内容调整或 Tauri 后端实现。每项调整都应先补充能够描述当前行为的测试，再进行结构修改。

## P0：脚本与自定义 UI 边界

状态：已完成。

### 统一脚本执行入口

当前 browser `controlledScriptExecutor` 使用 `Function` 执行脚本，`timeoutMs` 无法终止占用 renderer 的代码；`predicate.exec` 还会绕过 executor 直接使用 `new Function`。

调整目标：

- 所有规则脚本通过同一个显式 `scriptExecutor` 执行。
- 普通规则脚本在可终止的隔离环境中运行，超时后不会阻塞 renderer。
- 移除 `predicate.exec`，或让它使用受控 executor，不再直接执行字符串。
- 统一 Predicate 文档、JSON Schema 和运行时接受的脚本格式。
- 增加超时、异常、非法返回值和并发执行测试。

### 隔离自定义 React UI 错误

游戏卡自定义 React 组件的 render、effect 或事件处理异常不应破坏平台 UI。

调整目标：

- 在 `GameCardUIRoot` 外增加专用 Error Boundary。
- 将错误转换成统一的游戏卡运行时错误并可见地展示。
- 切换或重新加载游戏卡时能够恢复自定义 UI。
- 增加 render、effect 和事件异常测试。

## P1：Renderer 可读性与状态生命周期

状态：已完成。

### 重构消息渲染

当前消息渲染依赖参数较多的 `createElement` helper，普通和折叠视图重复实现消息过滤及列表渲染；折叠交互还使用模块级可变状态。

调整目标：

- 提取唯一的 `selectVisibleMessages()` 纯函数。
- 使用 `MessageList`、`MessageRow`、`MessageBubble` 等 React 组件表达结构。
- 使用 `useCollapsedHistory()` 管理拖动、timer 和展开状态。
- 删除模块级 `pullOffset`、timer 和 callback。
- 为持久化消息建立稳定 ID，不再使用数组下标作为 React key。
- 保持消息编辑、retry、thinking、流式输出和游戏卡 display rule 行为不变。

### 清理异步状态副作用

React state updater 必须保持纯函数，异步操作必须具有明确的错误和完成状态。

调整目标：

- 从 `useSettingsState` 的 state updater 中移除 IPC 保存操作。
- 配置自动保存使用 debounce 或串行 latest-wins 队列，避免旧请求覆盖新值。
- session、导入和设置操作使用 `try/catch/finally` 恢复 busy 状态。
- 所有 effect 中启动的 Promise 都被等待、捕获或安全取消。
- preload 订阅返回 unsubscribe，组件卸载时移除监听器。

## P1：扩展平台边界

状态：已完成。

游戏卡已经通过 platform adapter 访问 Electron，但配置、背景、session 和游戏卡导入仍由组件直接访问 `window.electronAPI`。

调整目标：

- 提取窄接口 `configService`、`backgroundService`、`sessionRepository` 和 `cardRepository`。
- React 组件只依赖接口或 Context，不直接调用 preload API。
- Electron 实现负责 IPC 返回值解包和错误标准化。
- 内存实现支持 renderer unit test，并作为未来 Tauri adapter 的 contract test 基础。
- `window.electronAPI` 只出现在 Electron adapter 和 preload 边界。

### 收紧 Game Card Platform contract

- `repository.getActiveCard()` 只返回 `card | null`，不兼容多种 IPC wrapper 结构。
- 明确资源接口是否允许读取非活动卡。
- 若保留 `cardId` 参数，Electron adapter 必须使用并校验它；否则从 contract 中删除。
- 删除 adapter 与 `sendPipeline` 中重复的 active card 解包逻辑。

## P2：流式协议可靠性

状态：已完成。

当前 API client 分别手写 OpenAI 和 Anthropic SSE 拆包，无法完整覆盖所有合法分隔符和任意字节位置拆包。

调整目标：

- 提取统一的增量 SSE parser。
- 支持 `\n`、`\r\n`、多行 `data`、尾部 decoder flush 和跨 chunk UTF-8。
- 明确处理 provider error event，避免静默吞掉完整但非法的事件。
- 增加任意位置拆包、中止、空 body、错误响应和不完整尾包测试。
- API client 从 `components` 移动到 chat service 目录。

## P2：测试有效性

状态：已完成。

- 将当前被 Jest 忽略的 `test/ipc/*.test.js` 转为有效 unit 或 integration 测试。
- 不通过删除测试解决旧测试失效；先确认是否已有等价覆盖。
- 在当前约 91% 行覆盖率基础上提高全局阈值，避免明显回退。
- 去除不必要的 `--forceExit`，检查 timer、listener、observer 和流 reader 是否正确释放。
- 为 Electron adapter 和未来平台 adapter 共用 contract test。

## P3：目录与公共接口整理

状态：已完成。

- 删除 `src/gameCard` 中未使用的纯重导出文件。
- core 测试直接导入 `shared/game-card`；renderer wrapper 只保留平台适配行为。
- 将 `apiClient`、错误标准化和非 UI hooks 从 `components` 移到对应 service/domain 目录。
- 合并重复的 JSON clone、deep freeze 和 IPC failure result helper。
- 为 React props 和平台 contract 增加一致的类型约束，可选择 PropTypes、JSDoc check 或渐进式 TypeScript。
- 将平台组件中的旧式 `React.createElement` 逐步改为 JSX；游戏卡动态源码编译边界除外。

完成结果：

- `src/gameCard` 只保留资源预载、受控脚本、样式和 UI runtime 等 renderer 适配模块，不再转发 shared core API。
- 设置 hooks、消息 hooks、模型参数和错误标准化已移动到各自 domain 目录。
- renderer/shared 与 Electron IPC 分别统一 JSON helper，IPC handler 共用 failure result helper。
- React props 由 ESLint 强制检查 PropTypes；平台 adapter 的异步 contract 集中定义在 `src/platform/contracts.js`。
- 静态平台组件统一使用 JSX，仅动态游戏卡组件挂载继续显式使用游戏卡提供的 React 实例。

## 推荐执行顺序

1. 自定义 UI Error Boundary。
2. 修复设置保存副作用和 preload 监听清理。
3. 激活被忽略的 IPC 测试，并提高覆盖率阈值。
4. 重构消息列表和折叠状态。
5. 扩展 renderer 平台 service。
6. 统一脚本 executor 和 Predicate 语法。
7. 重构 SSE parser。
8. 删除兼容重导出并整理目录、类型和公共 helper。

## 完成标准

- 游戏卡脚本超时或自定义 UI 抛错不会冻结或破坏平台界面。
- renderer 业务组件不直接访问 `window.electronAPI`。
- 消息折叠状态属于组件实例，不存在模块级交互状态。
- 配置、session 和导入失败后 UI 状态可恢复，连续保存不会乱序覆盖。
- 所有测试目录中的测试都被明确执行或明确归类，不存在无意失效的测试。
- unit、integration、Electron E2E、lint 和 build 全部通过。
- 非 WA2 内容文件继续遵守 200 行限制。
