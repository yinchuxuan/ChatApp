# 游戏卡操作与 Predicate

## insert

在指定位置插入一条新消息。

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

- `predicate`：定位锚点消息
- `anchor`：`before` 或 `after`，默认 `before`
- `role`：新消息的 role
- `content`：Content 描述符
- `ttl`：消息存活轮数，默认 `-1`
- `find`：可选。声明可被 `content` 引用的跨消息查询

## remove

删除匹配 predicate 的消息。运行时从后往前删除，避免索引偏移。

```json
{
  "type": "remove",
  "predicate": { "role": "system" }
}
```

## replace

修改匹配消息的 `content` 和/或 `ttl`。

```json
{
  "type": "replace",
  "predicate": { "role": "assistant" },
  "content": "{{original_content}}.regex_replace{pattern:'^```',with:''}",
  "ttl": 2
}
```

`replace` 支持可选 `find` 字段，供 `content` 引用当前消息数组中其他消息的 content。

## exec

兜底操作，用于声明式操作无法覆盖的游戏逻辑。`exec` 是受限上下文中的纯变换函数。

```json
{
  "type": "exec",
  "source": "const damage = utils.roll('1d6'); state.player.hp = utils.clamp(state.player.hp - damage, 0, 100); return { messages, state };"
}
```

运行时包装为：

```js
function run(ctx) {
  const { messages, state, config, event, utils } = ctx;
  // source
}
```

上下文字段：

| 字段 | 说明 |
|---|---|
| `messages` | 当前消息数组 |
| `state` | 当前游戏状态 |
| `config` | 游戏卡配置字段，只读 |
| `event` | 当前触发事件 |
| `utils` | `randomInt`、`roll`、`clamp`、`uuid` |

返回值固定为 `{ messages?, state?, effects? }`。不提供 `require` / `import` / `process` / `window` / `document` / `fetch` / `ipcRenderer` / Node.js / Electron API。

## Predicate

Predicate 是声明式匹配条件，用于 `insert` 定位锚点、`replace` / `remove` 定位目标，也用于 `when.last` / `when.any` / `when.all`。

| 语法 | 匹配逻辑 |
|---|---|
| `{ "role": "user" }` | `msg.role === "user"` |
| `{ "content": { "regex": "^【" } }` | 正则匹配 |
| `{ "content": { "contains": "关键词" } }` | 字符串包含 |
| `{ "role": { "in": ["user", "assistant"] } }` | 集合成员 |
| `{ "role": { "nin": ["system"] } }` | 非集合成员 |
| `{ "index": 0 }` | `i === 0` |
| `{ "index": "last" }` | `i === len - 1` |
| `{ "all": true }` | 所有消息 |
| `{ "exec": "(msg, i, msgs) => ..." }` | JS 函数匹配 |

逻辑组合：

```json
{ "or": [{ "role": "user" }, { "role": "assistant" }] }
{ "not": { "role": "system" } }
```

多 key 隐式 AND：`{ "role": "user", "_meta.source": "game_card" }` 表示 role 为 user 且 `_meta.source` 为 game_card。
