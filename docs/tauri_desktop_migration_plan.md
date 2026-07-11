# Tauri Desktop Migration Plan

## 目标与范围

将当前 Electron 应用迁移到 Tauri 2，并保持 macOS、Windows、Linux 桌面端的功能和数据兼容。

本计划不包含：

- Android 和 iOS 构建。
- 移动端响应式交互、文件选择和系统权限适配。
- 与迁移无关的新产品功能。
- 在功能对等前删除 Electron target。

迁移采用双 target 方式：React renderer 和 shared core 继续共用，Electron 与 Tauri 分别提供 native backend 和 renderer adapter。Tauri 通过全部验收后再移除 Electron。

## 当前基础

以下部分可以直接复用：

- `src/` 下由 Vite 构建的 React SPA。
- `shared/game-card/` 下的平台无关游戏卡规则、state、content 和 schema。
- `src/platform/contracts.js` 定义的 renderer service 与 Game Card Platform contract。
- 聊天生成、流式渲染、retry、中止、动态 UI 和受控游戏卡脚本的 renderer 逻辑。
- 当前 user data 目录结构和 JSON 数据格式。

以下部分必须替换或适配：

- `main.js` 的 Electron 生命周期和窗口创建。
- `preload.js` 的 `window.electronAPI` 桥接。
- `ipc/` 下基于 Node `fs`、Electron IPC 和 dialog 的 native backend。
- Electron `local://` 文件协议。
- Electron Playwright E2E、开发启动和打包流程。

## 实现原则

1. Shared core 不增加 Electron/Tauri 条件判断。
2. Renderer 只依赖现有 platform contracts，不直接调用 Tauri 文件系统插件。
3. Tauri 后端只暴露业务级窄 command，不向 WebView 暴露任意路径读写能力。
4. 游戏卡 schema 继续以 `shared/game-card/schema/game-card.schema.json` 为唯一结构规则来源。
5. 保持 session、retry state、game state、资源授权和原子写入的现有语义。
6. 每一阶段保持 Electron target 可运行，并新增对应测试后再进入下一阶段。
7. 新增 Rust 和配置文件同样遵守单文件不超过 200 行的仓库规则。

## 阶段 1：建立 Tauri 桌面工程（已完成，2026-07-11）

- 新增 `src-tauri/`、Cargo 配置、Tauri 配置、capability 和桌面图标。
- 配置 macOS、Windows、Linux 的应用标识、窗口尺寸和 bundle metadata。
- 让 Tauri 使用现有 Vite dev server 和 `dist/renderer` 输出。
- 调整 Vite 固定端口、`TAURI_DEV_HOST`、WebKit/Chromium 构建目标和 watch ignore。
- 增加 `tauri:dev`、`tauri:build` 等 npm scripts，不改变现有 Electron scripts。

验收条件：

- Tauri debug 窗口能加载现有 React 页面。
- Electron 开发和构建命令不受影响。
- macOS、Windows、Linux 至少都能完成空壳编译。

## 阶段 2：实现 Tauri Renderer Adapter（已完成，2026-07-11）

- 新增 `tauriRendererServices`，实现 config、background、sessions 和 cards contract。
- 新增 `tauriGameCardPlatform`，实现资源读取、active card 和受控脚本 contract。
- 使用 Vite 构建变量选择 Electron 或 Tauri adapter，避免运行时猜测平台。
- 使用 Tauri `invoke` 调用 command，使用 Tauri event 订阅背景配置变更。
- 统一取消、业务失败、文件和校验详情的错误归一化。
- 为 Electron、Tauri、memory adapter 运行相同 contract tests。

验收条件：

- React 业务组件不新增任何 Tauri import。
- Tauri adapter 可以用 mock commands 通过全部 contract tests。
- Electron adapter 的行为和测试保持不变。

## 阶段 3：迁移配置、存储与 Session（已完成，2026-07-11）

- 在 Rust 中使用 Tauri `app_data_dir` 建立与现有一致的数据目录。
- 实现 JSON 读取、目录创建、临时文件写入和同目录 rename 替换。
- 实现 model config 和 background config commands。
- 实现 session 列表、创建、切换、重命名和删除 commands。
- 实现 messages、game state、retry base 和 metadata 的读写。
- 使用按 session key 的异步锁保证同一 session 串行保存。
- 保持现有 command payload 和 renderer contract 的数据形状。

实现说明：

- Tauri 后端通过 `AppStorage` 统一管理 `app_data_dir`、原子 JSON 写入和按路径异步锁。
- model/background config、session metadata、messages、game state 和 retry base 已接入 Rust commands。
- 背景图片目录选择及 `local://` 资源授权仍按计划留在阶段 5，本阶段不开放任意本地路径。

验收条件：

- Tauri 下配置和聊天记录重启后仍然存在。
- latest-wins 配置保存和 session 并发保存测试通过。
- JSON 写入中断不会破坏最后一份有效数据。

## 阶段 4：迁移游戏卡仓库与导入（已完成，2026-07-11）

- 实现游戏卡列表、读取、保存、active card 和文本资源 commands。
- 使用桌面目录选择器实现游戏卡目录导入。
- 在临时目录完成复制和校验，成功后原子替换目标卡目录。
- 同名游戏卡覆盖时保留已有 `sessions/`。
- 在 Rust 中实现 `$import` 展开、循环检测、路径边界和引用文件存在性检查。
- 后端嵌入并使用 shared JSON Schema，不复制一份 Tauri schema。
- 对 schema 中 Ajv `$data` 的跨字段约束增加等价语义检查。
- 建立 JS 与 Rust 导入校验的共享 fixture corpus，验证成功和错误结果一致。

实现说明：

- Tauri 后端提供列表、单卡读取、保存、切换、active card、文本资源和目录导入 commands。
- 目录导入使用 Tauri dialog 插件在 Rust 边界选择目录；renderer 不获得任意文件系统权限。
- shared schema 通过 `include_str!` 直接嵌入 Rust，`x-file` 注解驱动资源存在性检查；Ajv `$data` 的随机数上下界约束由 Rust 语义检查补齐。
- 导入先在 cards 目录内的临时目录复制并复检，再通过备份、替换和失败回滚安装；同 id 卡片原有 `sessions/` 会合并到临时副本。
- JS 与 Rust 共用 `test/fixtures/game-card-import/`，覆盖有效 import、schema 错误、跨字段错误、缺失文件、路径穿越和循环 import。

验收条件：

- WA2 游戏卡可导入、覆盖、切换并读取全部章节资源。
- 无效 schema、缺失文件、路径穿越、符号链接逃逸和 import 循环均被拒绝。
- 覆盖导入后原 session 可继续加载。

## 阶段 5：迁移图片、背景和音频协议（已完成，2026-07-11）

- 在 Tauri 注册受控自定义资源协议，不直接开放整个 app data 目录。
- 每次请求校验 active card、card id、资源类型、扩展名、规范化路径和 realpath。
- 为用户背景保留独立授权路径，并由 Rust command 完成图片选择。
- 返回正确的图片和音频 MIME type。
- 为音频实现 Range 请求、`Content-Range` 和 `Accept-Ranges`，保证播放和 seek。
- 在 Tauri adapter 内处理各系统自定义协议 URL 形式差异。

实现说明：

- Tauri 注册异步 `local` 协议，文件读取在独立线程执行；协议不启用 asset scope，也不接受任意绝对路径。
- 游戏卡资源请求逐次校验 active card、card id、资源类型、允许扩展名、安全相对路径、规范化卡目录和资源 realpath。
- renderer adapter 使用 Tauri `convertFileSrc` 生成 macOS/Linux 与 Windows 对应的协议 URL；游戏卡路径和真实本地路径不会通过 command 返回。
- 用户背景由 Rust 文件选择器选择并暂存，保存配置后才授权；持久化配置只使用 `local://user-background/current` 标记，绝对路径不会返回 renderer。
- 图片和音频响应返回固定允许表对应的 MIME；音频支持 `HEAD`、单段 byte Range、`206`、`416`、`Content-Range` 和 `Accept-Ranges`。
- 开放式音频 Range 每次最多读取 `1000 KiB`，WebView 可以继续请求后续区间，无需一次将大音频读入 renderer。

验收条件：

- WA2 背景切换、事件背景、BGM 切换和恢复正常。
- 非 active card、越界路径和不支持的扩展名无法加载。
- 大音频文件不需要完整读入 renderer 内存即可播放和 seek。

## 阶段 6：验证网络、脚本和 WebView 兼容性（已完成，2026-07-11）

- 在三个桌面系统验证现有 browser `fetch`、SSE ReadableStream 和 AbortController。
- 仅当 WebView CORS 或流式行为无法稳定满足要求时，引入 Rust HTTP command 和 Tauri Channel。
- 若迁移网络请求，保持现有 OpenAI/Anthropic parser，并将中止映射到 request id。
- 验证 Blob Worker、受控 `Function`、动态 Game Card React UI 和超时终止。
- 配置满足动态 UI、Worker、模型 API 和自定义资源协议的 CSP。
- 保持 native commands 的参数校验，不能依赖 CSP 代替后端授权。
- 将 Google Fonts 等平台 UI 远程静态资源本地化，保证离线和 CSP 一致性。

实现说明：

- Electron 保持现有 browser `fetch`；Tauri 使用 Rust `reqwest` 发起模型 POST，并通过 Tauri Channel 将原始响应字节逐块转换为 renderer `ReadableStream`。
- OpenAI-compatible 与 Anthropic-compatible 继续共用现有 SSE parser；Rust 不解析 provider 协议。停止请求通过 renderer request id 调用 native cancel command，并终止对应响应流。
- Tauri CSP 只为现有能力开放 `unsafe-eval`、Blob Worker、运行时样式和受控 `local` 图片/音频；模型网络由 native command 完成，WebView 不开放任意外网 `connect-src`。
- native model command 校验 HTTP(S)、POST、请求大小、request id 和允许的模型 header；capability 仍只有 `core:default`，未增加文件系统或 shell 权限。
- Roboto 与 Roboto Mono 的拉丁字符子集随 Vite renderer 打包；中文继续使用系统字体，不再启动时访问 Google Fonts。
- 单元与集成测试覆盖 Channel 到 SSE、request-id 中止、Worker 超时、动态 React UI 编译及 CSP 静态约束。三个桌面系统的安装包 WebDriver 回归仍由阶段 8 的 build matrix 执行。

验收条件：

- OpenAI-compatible 和 Anthropic-compatible 流式生成、思考内容和停止请求正常。
- WA2 timeline、事件 effects、动态 UI 和 game script 在三个系统行为一致。
- capability 和 CSP 不开放任意文件系统、shell 或未使用的 native 权限。

## 阶段 7：迁移 Electron 用户数据

- 首次启动时查找各桌面系统的旧 Electron `userData` 目录。
- 复用当前目录结构迁移 config、game cards、active card 和所有 sessions。
- 保留现有 legacy flat card、旧 chat history 和背景配置迁移规则。
- 使用迁移版本或完成标记保证迁移可重复执行且不会覆盖新数据。
- 旧背景文件不存在或无权限时给出可恢复错误，不影响其它数据启动。

验收条件：

- 使用真实 Electron 数据启动 Tauri 后，当前卡、session、消息和 state 保持一致。
- 重复启动不会重复复制或回滚较新的 Tauri 数据。
- 迁移失败可记录具体阶段和文件，不留下半完成目录。

## 阶段 8：测试、构建与桌面发布

- 保留 Jest unit/integration tests，增加 Tauri adapter tests。
- 增加 Rust storage、path、import、migration、resource protocol 单元和集成测试。
- 建立 Tauri WebdriverIO E2E，迁移当前 Electron 关键用户流程。
- E2E 覆盖设置、session、retry、中止、游戏卡导入、动态 UI、背景和 BGM。
- 建立 macOS、Windows、Linux CI build matrix。
- 配置 macOS bundle/DMG、Windows installer、Linux AppImage 或 deb。
- 在发布构建中验证 CSP、资源协议、日志、窗口生命周期和应用数据路径。

验收条件：

- 三个平台的 build、Rust tests、Jest tests 和 Tauri E2E 全部通过。
- 安装版应用可完成一轮 WA2 主流程并在重启后恢复状态。
- 安装包签名和分发配置满足目标发布渠道要求。

## 阶段 9：切换默认 Target 并清理 Electron

- 将默认开发、测试和发布命令切换到 Tauri。
- 完成至少一个稳定版本的数据迁移和回归验证。
- 删除 `main.js`、`preload.js`、Electron adapters、Electron-only IPC 注册代码和依赖。
- 删除或迁移 Electron Playwright E2E 和 mocks。
- 更新 architecture、platform adapter、build/test 和开发环境文档。

验收条件：

- 仓库不再依赖 Electron runtime。
- Shared core 和 renderer 中不存在废弃 Electron 平台判断。
- Tauri 成为唯一桌面生产 target，旧 Electron 用户数据仍可导入。

## 主要风险与决策点

- **游戏卡导入校验**：Rust 与 Ajv 的行为必须由共享 fixture 保证一致，不能维护两份 schema。
- **资源协议**：必须支持音频 Range，并保持 active card 授权，不能用宽泛 asset scope 替代。
- **动态脚本与 CSP**：游戏卡脚本依赖 Worker 和动态函数，CSP 需要在功能与暴露面之间明确取舍。
- **模型网络请求**：先验证现有实现，只有跨 WebView 不稳定时才增加 Rust 流式网络层。
- **跨 WebView 渲染**：重点回归毛玻璃、音频格式、滚动、输入法和动态 UI，不假设 Chromium 行为等同于 WebKitGTK/WKWebView。

## 完成定义

桌面迁移只有在以下条件全部满足时完成：

- macOS、Windows、Linux 功能对等。
- Electron 用户数据可迁移且不会丢失 session 或 game state。
- WA2 游戏卡的脚本、UI、背景、BGM、事件和多章节流程通过回归。
- 文件系统和本地资源权限不比当前 Electron 实现更宽。
- Tauri 安装包、测试和 CI 可稳定复现。
