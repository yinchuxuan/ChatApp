# Chat Session Design

## 目标

聊天 session 用来保存和加载同一游戏卡下的多条独立对话线。每个 session 必须包含完整的聊天上下文、游戏状态和重试基准，切换 session 时应恢复到该 session 自己的状态。

## 当前基础

现有聊天历史已经按 active game card 和 active session 读取：

```
game-cards/
  no-card/
    sessions/
      active.json
      default/
        messages.json
        retry-base.json
  cards/
    <card-id>/
      sessions/
        active.json
        default/
          messages.json
          retry-base.json
```

`get-chat-history` 和 `save-chat-history` 始终操作当前 active session。缺少的是显式的 session 列表、创建、切换、重命名和删除机制。

## 数据结构

每个 session root 增加 `index.json`：

```
sessions/
  active.json
  index.json
  <session-id>/
    messages.json
    retry-base.json
```

`active.json`：

```json
{
  "id": "default"
}
```

`index.json`：

```json
{
  "sessions": [
    {
      "id": "default",
      "title": "默认会话",
      "createdAt": "2026-05-31T10:00:00.000Z",
      "updatedAt": "2026-05-31T10:20:00.000Z",
      "messageCount": 12,
      "preview": "春希推开第三音乐室的门..."
    }
  ]
}
```

`messages.json` 继续保存当前格式：

```json
{
  "messages": [],
  "gameState": {}
}
```

`retry-base.json` 继续保存重试基准：

```json
{
  "messages": [],
  "gameState": {}
}
```

## IPC 接口

保留现有接口：

- `get-chat-history`
- `save-chat-history`

新增 session 管理接口：

- `list-chat-sessions`
- `get-active-chat-session`
- `create-chat-session`
- `set-active-chat-session`
- `rename-chat-session`
- `delete-chat-session`

preload 暴露同名 camelCase 方法：

- `listChatSessions()`
- `getActiveChatSession()`
- `createChatSession(title)`
- `setActiveChatSession(id)`
- `renameChatSession(id, title)`
- `deleteChatSession(id)`

## 行为规则

- session 作用域跟随当前游戏卡；未加载游戏卡时使用 `no-card`。
- 如果 session root 不存在，自动创建 `default` session。
- `save-chat-history` 成功后更新当前 session 的 `updatedAt`、`messageCount` 和 `preview`。
- 新 session 初始包含空 `messages.json` 和空 `retry-base.json`。
- 切换 session 前先保存当前内存中的 messages、gameState 和 retry base。
- 切换 session 后重新调用现有历史加载流程，并重新执行 game card init。
- 删除当前 session 后切换到最近更新的其它 session；如果没有其它 session，则创建新的 `default`。
- session id 必须复用现有安全 id 规则，避免路径穿越。

## 前端集成

`ChatPanel` 仍然通过 `getChatHistory()` 和 `saveChatHistory()` 读写当前 session。新增一个 session 控件负责管理 active session：

- 显示当前游戏卡名和当前 session 标题。
- 展开后列出同一游戏卡下的 session。
- 支持新建、切换、重命名和删除。
- 切换时重置 streaming、retry ref 和展开状态。

session 控件不应该依赖 msg 历史调试面板；msg 历史仍只用于查看当前保存内容。

## 测试范围

IPC 测试：

- 创建 session 会写入目录、`messages.json`、`retry-base.json` 和 `index.json`。
- 切换 active session 后 `get-chat-history` 读取不同内容。
- `save-chat-history` 会保存 `gameState` 并更新 session metadata。
- no-card session 和不同 game card session 互相隔离。
- 删除当前 session 后 active session 有合理 fallback。

组件测试：

- session 列表可以加载并显示。
- 新建 session 会清空当前聊天并重新执行 init。
- 切换 session 会恢复对应 messages 和 gameState。

E2E 测试：

- 同一游戏卡下创建两个 session，分别发送消息，切换后历史保持独立。
- 切换游戏卡后 session 列表跟随游戏卡变化。
