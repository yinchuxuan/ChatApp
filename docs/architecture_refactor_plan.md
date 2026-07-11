# Architecture Refactor Plan

## 目标

本轮重构用于降低平台前端、游戏卡运行时与 Electron 基础设施之间的耦合，并为未来接入 Tauri 提供清晰的平台适配边界。

重构应保持以下行为不变：

- 游戏卡 JSON、DSL、state、script 和 effects 语法。
- 聊天、重试、流式输出、session、背景和 BGM 行为。
- 游戏卡自定义 React UI 的现有能力与权限范围。
- 已有用户数据和游戏卡目录格式。

本轮不设计游戏卡信任分级，也不借重构增加新的游戏卡能力。

## 当前主要问题

1. Renderer 使用 `window.*` 作为模块注册表，并依赖 `index.html` 中的脚本顺序。
2. `src/gameCard` 同时包含纯规则、浏览器运行时、资源加载和 UI 逻辑。
3. Electron 主进程直接引用 renderer 目录中的游戏卡代码。
4. `ChatPanel` 同时管理聊天、持久化、游戏卡、滚动、音频和 UI 协调。
5. IPC 存储使用同步、分散且非原子的 JSON 文件操作。
6. JSON Schema 和手写 validator 同时描述游戏卡协议。
7. CSS 同时存在聚合入口和 `index.html` 手工入口。
8. `local://` 可以解析任意本地绝对路径。

## 目标结构

```text
shared/game-card/             平台无关的游戏卡核心
  engine/                     rule、action、predicate、TTL
  content/                    content 解析与转换
  state/                      state action、patch、schema
  schema/                     JSON Schema 与协议校验
  protocol/                   LLM 消息协议适配
  exec/                       script context 与结果协议

src/                          React renderer
  chat/                       聊天界面与会话协调
  gameCard/runtime/           renderer 游戏卡运行时
  gameCard/ui/                自定义 UI runtime
  gameCard/audio/             BGM 组件
  gameCard/visual/            背景与视觉组件
  platform/                   Electron/Tauri 前端适配器

ipc/                          Electron 主进程适配
  gameCard/                   导入、存储和资源读取
  storage/                    JSON store 与 migration
```

实际迁移可以渐进进行，不要求一次完成全部目录移动。

## 阶段 1：收紧本地资源协议

状态：已完成（2026-07-11）。

- 将 `local://` 请求限制为平台明确授权的资源。
- 游戏卡图片和音频只能来自已安装游戏卡目录。
- 用户背景只能访问当前配置中记录的背景文件。
- 解析路径后使用 `realpath` 再次确认没有离开授权目录。
- 保留图片和音频扩展名白名单。
- IPC 返回资源 URL，不再向 renderer 暴露真实绝对路径。
- 添加允许访问、路径穿越、非授权文件和非法扩展名测试。

验收条件：现有背景和 BGM 正常工作，构造任意 `local://` 路径无法加载授权范围外的文件。

## 阶段 2：引入标准 Renderer Bundler

状态：已完成（2026-07-11）。

- 使用 Vite 或 esbuild 构建 React renderer。
- 新增单一 renderer 入口，例如 `src/main.jsx`。
- 将平台组件改为正常的 `import/export`。
- 删除 `build.js` 中删除模块语法和改写导出的逻辑。
- 删除 `index.html` 中手工维护的组件脚本顺序。
- 移除作为模块注册表使用的 `window.ChatPanel`、`window.GameCard*`、`window.prepare*` 等全局变量。
- 保留 `window.electronAPI`，它是 preload 提供的平台边界。
- 更新 Jest、Electron 开发启动和生产构建配置。

实现结果：Vite 从 `src/main.jsx` 构建单一 renderer 入口，平台 React 与游戏卡运行时模块均使用 ESM；Electron 开发模式连接 Vite dev server，生产和 E2E 加载 `dist/renderer/index.html`。`window.electronAPI` 保留，旧 Babel 构建改写与平台模块全局注册已删除。

验收条件：renderer 只通过一个入口构建，调整源码文件顺序不会影响运行，现有 unit、integration 和 E2E 测试通过。

## 阶段 3：提取平台无关 Game Card Core

状态：已完成（2026-07-11）。

- 将纯逻辑移动到 `shared/game-card`。
- 优先迁移 predicate、TTL、state paths、state actions 和 content transforms。
- 再迁移 engine、actions、content resolver、protocol adapter 和 validator。
- Shared 模块不得依赖 `window`、DOM、React、Electron、Node `fs` 或本地路径。
- Shared 函数只接收普通数据和显式依赖，返回可序列化结果。
- 为迁移模块保留现有行为测试，并增加无浏览器环境测试。

实现结果：纯规则实现已迁移到 `shared/game-card`，按 engine、content、state、schema 与 protocol 分层。renderer 中的同名模块仅保留兼容导出和 `exec`/本地文件读取适配；这些能力通过显式函数依赖传入 core。Electron 游戏卡导入校验直接使用 shared validator 和 state schema，不再引用 `src/`。

验收条件：Shared core 可以在纯 Node 测试中运行，Electron 主进程不再从 `src/` 导入规则代码。

## 阶段 4：建立平台接口与适配器

状态：已完成（2026-07-11）。

定义最小平台接口：

```js
resources.readText(cardId, relativePath)
resources.getImageUrl(cardId, relativePath)
resources.getAudioUrl(cardId, relativePath)
repository.getActiveCard()
scriptExecutor.run(source, context, options)
```

- `sendPipeline` 通过参数接收接口，不直接访问 `window.electronAPI`。
- 将 state schema 的“文件加载”和“schema 合并”拆开。
- 将 exec 的 context、result validation 与具体执行环境拆开。
- Electron adapter 调用现有 preload API。
- 为未来 Tauri adapter 保留同一接口，但本轮不实现 Tauri 后端。
- 禁止在 Shared 中通过运行时判断选择 Electron 或 Tauri。

实现结果：`src/platform` 提供统一 contract、Electron adapter 和测试用内存 adapter。消息管线、游戏卡文本资源、自定义 UI 样式、背景和 BGM 均通过该接口访问平台能力；Electron adapter 负责解析 preload IPC 返回值。exec 上下文和结果校验位于 `shared/game-card/exec`，renderer 只保留受控脚本执行环境。state schema 的读取、解析和合并已拆分为独立步骤。

验收条件：测试可以传入内存 adapter 运行完整 pre-send、after-response 和 init 管线。

## 阶段 5：拆分聊天运行时

状态：已完成（2026-07-11）。

- 将 session 加载、保存和切换提取为 `useChatSession`。
- 将自动保存和 retry base 管理提取为 `useChatPersistence`。
- 将生成、retry 和 abort 统一到 `useChatGeneration`。
- 将滚动定位提取为 `useChatScroll`。
- 使用 `GameCardRuntimeProvider` 管理 active card、gameState 和 runtime error。
- 用 props、Context 或明确的 service 替代平台内部 `CustomEvent`。
- `ChatPanel` 只负责页面组合和少量界面状态。

实现结果：新增 `src/chat` 运行时层。`useChatSession` 负责历史加载、保存和 session 切换，`useChatPersistence` 负责自动保存与 retry 快照，`useChatGeneration` 统一发送、retry 和 abort，`useChatScroll` 管理消息定位。`GameCardRuntimeProvider` 统一持有 active card、gameState 与 runtime error；游戏卡切换、输入命令、模型配置和视觉更新改为 Context、显式 service 或 props 回调，不再依赖 renderer 内部 `CustomEvent`。`ChatPanel` 仅挂载 provider 与 `ChatRuntime`。

验收条件：聊天发送、重试、编辑最后一条 user 消息、停止生成、session 切换和游戏卡切换行为不变。

## 阶段 6：统一 IPC 存储

状态：已完成（2026-07-11）。

- 提取共享的 JSON read/write、目录创建和错误包装逻辑。
- 使用临时文件加 rename 实现原子 JSON 写入。
- 为同一 session 的保存操作增加串行队列。
- 将大目录复制等操作改为异步文件 API，避免阻塞 Electron 主线程。
- 将旧数据 migration 从 handler 注册逻辑中移出，集中在启动阶段执行。
- 保持现有 userData 目录结构和迁移兼容性。

实现结果：新增 `ipc/storage` 统一异步 JSON store、keyed queue 与启动 migration。业务 JSON 通过同目录临时文件写入并以 `rename` 原子替换；聊天历史按 session 串行保存 messages、gameState、retry base 和 metadata。配置、背景、游戏卡与 session handler 共享同一 store，游戏卡目录复制改用异步文件 API；旧配置、背景、聊天与游戏卡迁移统一在窗口创建前执行，不再由 handler 注册触发。

验收条件：写入失败不会留下半写 JSON，messages、gameState、retry base 和 session metadata 保持一致。

## 阶段 7：统一游戏卡协议校验

- 选择 `game-card.schema.json` 作为结构协议的唯一事实源。
- 在导入和运行前使用同一个 JSON Schema validator。
- 手写校验只保留文件存在性、循环引用等跨文件语义检查。
- 为 schema 增加独立版本，并明确版本升级规则。
- Electron 和未来 Tauri 后端共享同一份 schema 文件。

验收条件：新增或删除语法只需修改一份结构定义，导入校验和运行时校验结果一致。

## 阶段 8：整理样式、测试和文档

- 只保留一个平台 CSS 入口，由 bundler 管理加载顺序。
- 游戏卡运行时 CSS 继续独立加载并保持主题作用域。
- 按 chat、game-card、storage 和 platform adapter 重新组织测试。
- 减少测试对 `window.*` 的直接覆盖，优先 mock 显式接口。
- 更新架构、构建、游戏卡 runtime 和平台适配文档。
- 修复失效的文档链接。
- 拆分超过 200 行的非豁免文件，避免通过压缩语句满足行数限制。

验收条件：文档描述与实际目录和调用方向一致，CSS 不再存在两套入口。

## 执行原则

- 每个阶段单独提交，避免行为修改和目录迁移混在一起。
- 先增加 characterization tests，再移动已有逻辑。
- 每次只改变一条依赖边界，保持主分支持续可运行。
- 不在重构提交中修改游戏卡 DSL 或 WA2 剧情内容。
- 不为尚未实现的 Tauri 后端提前加入平台判断。
- 新文件继续遵守 200 行限制，WA2 内容资产沿用现有豁免。

## 完成标准

- Renderer 使用标准模块系统，不依赖脚本加载顺序。
- 游戏卡核心不依赖 Electron 或浏览器全局对象。
- Electron 与未来 Tauri 通过 adapter 接入同一套前端核心。
- `ChatPanel` 不再承担持久化、游戏卡和生成管线的全部职责。
- 本地资源、存储和协议校验拥有单一、可测试的边界。
- 全量 unit、integration、E2E、lint 和 build 均通过。
