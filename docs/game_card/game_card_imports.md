# 游戏卡 JSON Import

JSON 标准本身不支持 import。平台在读取游戏卡时提供一个加载期扩展：

```json
{ "$import": "rules/timeline.json" }
```

导入会在主进程读取 `card.json` 时展开。前端、规则引擎和校验器只看到展开后的完整游戏卡。

## 顺序

`rules` 数组顺序是执行顺序。数组里的 import 会在原位置展开：

```json
{
  "rules": [
    { "$import": "rules/init.json" },
    { "$import": "rules/timeline.json" },
    { "id": "tail", "when": { "phase": "pre_send" }, "then": [] }
  ]
}
```

如果 `rules/timeline.json` 是数组，数组内规则会按文件内顺序插入到该位置。

## 安全限制

- 只能导入当前游戏卡目录内的相对路径。
- 禁止绝对路径、反斜杠、空路径段和 `..`。
- 只能导入 `.json` 文件。
- 循环导入会报错。
- import 深度超过限制会报错。

## 推荐拆分

```txt
white-album-2/
  card.json
  rules/
    init.json
    context.json
    timeline.json
```

`card.json` 保留游戏卡入口信息，复杂规则放到 `rules/` 下拆分。
