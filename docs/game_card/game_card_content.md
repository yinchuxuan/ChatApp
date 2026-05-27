# 游戏卡 Content 描述符

Content 描述符描述如何生成一条消息的 `content` 值。

## 原子内容来源

| 来源 | 语法 | 说明 |
|---|---|---|
| 消息原文 | `{{original_content}}` | `replace` 时为被匹配消息的 content；`insert` 时为空字符串 |
| 字符串 | `{{raw_string:文本}}` | 字面量字符串，`\}}` 和 `\\` 需要转义 |
| 外部文件 | `{{file_content:path/to/file.md}}` | 从游戏卡目录相对路径读取文件内容 |
| Markdown 章节 | `{{file_section:path/to/file.md##标题}}` | 读取指定层级标题下的章节内容 |
| 跨消息查询 | `{{find:name}}` | 读取当前 action 的 `find.name` 查询结果，返回 content 列表 |

## Markdown 章节

`file_section` 的标题层级必须和 Markdown 文件里的标题层级一致：

```txt
{{file_section:worldbook/routes.md##雪菜线}}
```

只会匹配文件里的二级标题：

```md
## 雪菜线
这里是雪菜线规则。

### 临时状态
同属雪菜线，会一起返回。

## 和纱线
这里不会返回。
```

返回内容不包含标题本身，直到下一个同级或更高级标题为止。找不到标题会报错。

## find 查询

`insert` / `replace` 可声明 `find`，用 Predicate 从当前 action 输入的完整 `messages` 中查询其他消息。

```json
{
  "type": "replace",
  "predicate": { "_meta.source": "summary" },
  "find": {
    "summaryMsgs": {
      "predicate": {
        "role": "assistant",
        "content": { "regex": "<summary>[\\s\\S]*?</summary>" }
      },
      "join": "\n"
    }
  },
  "content": "{{find:summaryMsgs}}"
}
```

| 字段 | 说明 |
|---|---|
| `predicate` | 必填。复用 Predicate 语法，命中的消息按原顺序返回 |
| `join` | 可选。`{{find:name}}` 最终仍为列表时的默认拼接符，默认 `\n` |

`find` 只返回命中消息的 `content`。若没有命中，返回空列表；最终渲染为空字符串。

## Content 值类型

Content 表达式的中间值可以是 `string` 或 `string[]`。`{{find:name}}` 返回 `string[]`；普通来源返回 `string`。

Transform 函数默认支持列表输入：对列表中每个 item 逐条应用。`.join{...}` 将列表收敛为字符串；如果最终结果仍是列表，使用对应 `find.join` 或默认 `\n` 拼接。

## Transform 函数

| 函数 | 参数 | 效果 |
|---|---|---|
| `regex_replace` | `pattern`, `with`, `flags?` | 正则替换 |
| `regex_extract` | `pattern`, `group?` | 提取捕获组；`group` 默认 1，没有捕获组时取完整匹配 |
| `format` | 模板字符串 | 用 `{{value}}` 引用当前值，用于逐项加前后缀 |
| `join` | 分隔字符串 | 将 `string[]` 拼接成 `string` |

## 组合规则

```txt
expression = chain ("+" chain)*
chain      = source ("." transform)*
source     = "{{original_content}}" | "{{raw_string:...}}" | "{{file_content:...}}" | "{{file_section:...}}" | "{{find:name}}"
```

`.` 绑定优先级高于 `+`。多个 source 各自变换后拼接，不需要括号。

## 示例

```txt
{{original_content}}.regex_replace{pattern:'^```',with:''}
```

```txt
{{original_content}} + {{file_content:worldbook/rules.md}}
```

```txt
{{raw_string:【回复】}} + {{original_content}}
```

跨消息提取并追加：

```json
{
  "type": "replace",
  "predicate": { "_meta.source": "wa2_summary" },
  "find": {
    "summaryMsgs": {
      "predicate": {
        "role": "assistant",
        "content": { "regex": "<summary>[\\s\\S]*?</summary>" }
      }
    }
  },
  "content": "{{original_content}}.regex_replace{pattern:'\\n暂无\\s*$',with:''}\n{{find:summaryMsgs}}.regex_extract{pattern:'<summary>([\\s\\S]*?)</summary>'}.format{'- {{value}}'}.join{'\\n'}"
}
```
