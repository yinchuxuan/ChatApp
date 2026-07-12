# Frontend Quality Improvement Plan

## 目标

本文记录当前平台前端和 White Album 2 游戏卡前端的主要质量问题，并给出分阶段改进方案。

改进目标：
- 保证游戏卡切换和 UI state 更新结果确定，不受异步完成顺序影响。
- 降低流式 Markdown、动态脚本和大面积毛玻璃的运行成本。
- 保持平台 UI、游戏卡 React UI 和游戏卡脚本之间的职责边界。
- 补齐键盘、触屏和辅助技术所需的基础交互能力。
- 让 WA2 视觉效果能够通过真实 WebView 测试验证，而不是只检查 CSS 文本。

## 范围

平台前端：
- `src/renderer/chat/`
- `src/renderer/components/`
- `src/renderer/gameCard/`
- `src/renderer/styles/`

WA2 游戏卡前端：
- `game-card-examples/white-album-2/ui.css`
- `game-card-examples/white-album-2/display.css`
- `game-card-examples/white-album-2/ui/root.js`
- `game-card-examples/white-album-2/ui/root.css`

## 当前基础

现有实现中值得保留的设计：
- 平台通过 `data-gc-part` 提供相对稳定的 CSS 挂载点。
- 游戏卡 React UI 通过受控 `emit` 修改输入框和 game state。
- renderer、平台适配器和 shared game card core 已经分层。
- WA2 事件正文复用了平台的 Markdown、sanitize 和引号高亮管线。
- 游戏卡样式按当前卡动态加载，切卡时可以清理。

## P0：可靠性

### 1. 串行执行 UI state 事件

状态：已完成。

问题：
`game.state.apply` 和 `game.script.run` 会异步读取同一个 `stateRef.current`。用户快速连续点击时，多个操作可能基于相同旧 state 计算，后完成的结果会覆盖先完成的结果。

方案：
- 在 `GameCardUIRoot` 平台侧建立每个 active card/session 独立的 Promise queue。
- 每个 state/script 事件开始时读取队列中最新 state。
- 卡片切换或 Root 卸载后，旧队列结果不得写回新卡 state。
- `emit` 继续返回 Promise，让游戏卡组件可以展示 pending 状态。

测试：
- 连续两次增量操作必须得到累计结果。
- state action 和 script action 混合执行时保持触发顺序。
- 操作未完成时切卡，旧结果不能污染新卡。

### 2. 统一游戏卡样式宿主（已完成）

问题：
`display`、`visual`、`ui` 和 React Root 样式分别异步读取并插入 DOM。它们的最终层叠顺序取决于文件读取速度；快速切卡时，旧卡 CSS 还可能在新卡 CSS 之后写回。

方案：
- 增加统一的 `GameCardStyleHost`。
- 固定层叠顺序为 `display -> visual -> ui -> root`。
- 使用递增 request version，只允许最新加载请求提交内容。
- 同步创建固定顺序的 `<style>` 节点，异步过程只更新 `textContent`。
- 合并三个重复的 stylesheet loader 和路径检查逻辑。

测试：
- 人为控制四个资源的完成顺序，最终 style 顺序仍然固定。
- card A 延迟返回、card B 先完成时，DOM 中只能保留 card B 样式。
- 无样式或读取失败时，对应 style slot 应清空。

## P1：性能与交互

### 3. 优化流式消息渲染（已完成）

问题：
打字机每帧推进少量字符，每次更新都会重新执行 Markdown、DOMPurify 和引号高亮。历史展开后，已完成消息也可能随父组件重复解析。长回复会产生大量重复工作。

方案：
- 将消息正文提取为独立 `MessageContent` 组件。
- 按 `content + role + display revision` 缓存已完成消息的 HTML。
- 流式内容按时间或字符块批量刷新，不再固定每帧两个字符。
- 保持最终完整内容走一次完整 Markdown 和 sanitize。
- 用性能测试比较长文本的解析次数和渲染耗时。

验收：
- 3000 字流式回复不会触发数千次完整 Markdown 解析。
- 新 token 到达时，已完成历史消息不重新解析。
- 停止、retry、thinking 和可点击选项行为保持不变。

### 4. 缓存游戏卡 UI runtime 资源（已完成）

问题：
每次 UI action 都可能重新展开 `$import`、读取 state schema、读取脚本和声明文件。事件面板影响有限，但战斗等高频本地 UI 会产生明显延迟。

方案：
- 按 `cardId + card revision` 缓存 expanded card 和 merged state schema。
- 缓存脚本源码、include 依赖图和只读声明文件。
- 切卡、重新导入同名卡或 revision 改变时统一失效。
- 不缓存执行后的可变 state。

测试：
- 同一卡连续执行 action 时，每个静态资源只读取一次。
- 重新导入游戏卡后必须读取新内容。
- 缓存不改变脚本错误、schema clamp 和 state trace 结果。

### 5. 补齐非鼠标交互

问题：
隐藏输入框和标题栏主要依赖 hover 触发；收起的历史记录只能通过滚轮上拉展开。键盘和触屏用户缺少可靠入口。

方案：
- 为输入框和标题栏提供可聚焦的显隐按钮或稳定快捷键。
- 为折叠历史增加真实 `button`，保留滚轮手势作为增强行为。
- 为消息列表增加 `role="log"`、`aria-live` 和生成状态说明。
- 自定义面板打开时管理 focus，并阻止焦点进入已隐藏主内容。
- 保持所有主要点击目标至少 44 x 44 CSS px。

测试：
- 只使用键盘可以打开输入框、发送、停止和展开历史。
- 触屏点击不依赖 hover。
- WA2 事件面板打开后，Tab 不进入隐藏的主剧情选项。

## P2：WA2 前端整理

### 6. 降低毛玻璃合成成本

问题：
WA2 正文区和事件区使用大面积 `backdrop-filter`，并分别叠加大量 radial gradient、mask 和阴影。这会增加 WebView 的绘制与 tile memory 压力。

方案：
- 将雪点预渲染成小型透明 WebP 或 PNG 纹理资源。
- 每个面板最多保留一层纹理、一层白雾和一层低强度 blur。
- 正文区和事件区共享颜色、雾强度、纹理和边框 CSS variables。
- 移除被后续声明覆盖的 mask、gradient 和重复选择器。
- 对 `prefers-reduced-motion` 关闭非必要 blur/transform 动画。

验收：
- 视觉主题仍保持冬天、白色和零星雪点。
- 事件切换和背景动画期间不出现明显掉帧或 tile memory 警告。
- 1280x800 和较大桌面窗口中背景图仍清晰可见。

### 7. 将事件业务逻辑移出 React Root（已完成）

问题：
WA2 `ui/root.js` 同时负责渲染、好感度计算、事件消费和背景/BGM 恢复。新增事件类型后，组件会继续膨胀。

方案：
- 在 runtime 缓存完成后，增加单个事件控制脚本。
- 通过 payload 区分 `open`、`close` 和 `consume`。
- 脚本原子处理队列、好感度、panel state、背景和 BGM。
- React Root 只读取 state、渲染内容并发送受控事件。

测试：
- 打开、关闭和消费事件的现有行为不变。
- 快速重复点击不会重复消费或丢失好感度变化。
- 事件背景/BGM 缺失时能正确删除并恢复原场景变量。

### 8. 修正 WA2 CSS 语义偏差（已完成）

需要处理：
- 删除先声明复杂 mask、随后又用 `mask: none` 覆盖的无效代码。
- 统一浅色和深色模式下引号高亮的颜色、字重和装饰。
- 优先使用 `data-gc-part` 和 CSS variables，减少对 `.chat-*` 内部 class 的依赖。
- 为事件 trigger 提供不少于 44 x 44 的命中区，图标可以保持较小。
- 为事件面板补充正确的 dialog/region 语义和 focus 行为。

## 测试改进

当前 WA2 样式测试主要使用 `toContain` 验证 CSS 字符串，无法发现层叠覆盖、实际尺寸和视觉回归。

建议增加：
- JSDOM computed-style 可验证的基础状态测试。
- Tauri WebView 中的 WA2 导入与事件切换 E2E。
- 1280x800、800x600 两个桌面尺寸的截图基线。
- 浅色/深色、事件关闭/打开、输入框显示/隐藏组合。
- 长文本滚动、背景切换、BGM 恢复和 reduced-motion 场景。

截图测试不替代行为断言。布局尺寸、可滚动性、焦点和 state 结果仍应使用明确断言。

## 推荐实施顺序

1. 串行化 UI state/script 事件。
2. 建立统一、有版本控制的游戏卡样式宿主。
3. 缓存 expanded card、schema 和 UI script 资源。
4. 优化流式 Markdown 渲染和已完成消息缓存。
5. 补齐键盘、触屏和消息区可访问性。
6. 精简 WA2 毛玻璃与雪点实现。
7. 将 WA2 事件状态转换迁入受控脚本。
8. 建立真实 WebView 视觉回归测试。

## 非目标

- 本计划不调整剧情、时间线和好感度数值设计。
- 本计划不引入新的移动端布局体系。
- 本计划不扩大游戏卡可调用的 Tauri native 权限。
- 本计划不以删除测试或降低视觉要求换取通过。
