# State 写入契约

只能在 `<state_patch>` 中写入本契约列出的路径。路径名必须完全匹配；场景画面和音乐通常只能使用下列通用值。固定剧情引导可以额外提供仅限当前节点使用的画面和音乐值，离开该节点后不得继续选择。未列出的 State 一律不得修改。

## 剧情结算字段

- `touma.affection`：冬马和纱对春希的好感度。数值范围为 0～100；只有特殊互动才变化，单轮变化不超过 5。
- `setsuna.affection`：小木曾雪菜对春希的好感度。数值范围为 0～100；只有特殊互动才变化，单轮变化不超过 5。
- `performance.proficiency`：学园祭演出熟练度，数值范围为 0～100。只有实际发生合奏、练琴、排练、声乐、键盘或吉他磨合等演出练习时才增加，通常增加 1～5。
- `timeline.currentTime`：本轮正文结束时的剧情时间，格式必须为 `YYYY.MM.DD: HH:mm 星期X`，且不得晚于当前的 `timeline.currentSlotEnd`。

## 演出切换字段

- `visual.scene`：当前镜头的基础画面。通用值均为允许叠加立绘的 background：`musical_classroom3`（第三音乐室）、`school`（校园公共区域）、`classroom`（普通教室）。固定剧情还会临时开放场景CG使用。
- `visual.portraits`：当前镜头所有可见人物到表情的完整映射，最多四人。人物可写 `touma`（冬马和纱）、`setsuna`（小木曾雪菜）、`mizusawa`（水泽依绪）、`takeya`（饭冢武也）、`yanagihara`（柳原朋）；表情可写 `normal`（平静自然）、`happy`（开心喜悦）、`sad`（悲伤失落）、`angry`（生气愤怒）、`surprise`（惊讶意外）。例如 `{"touma":"sad","setsuna":"normal"}`。位置和大小由平台自动编排，不要输出位置。北原春希没有立绘；远景、空镜、春希独处或没有合适立绘时写 `{}`。
- `audio.bgm`：当前镜头音乐。通用可写值：`daily`（轻松日常）、`happy`（明确喜悦）、`normal`（平稳交流）、`sad`（克制伤感）、`tragic`（激烈冲突）。

## 只读剧情边界

- `timeline.currentSlot`：当前剧情节点，由系统维护，不得写入。
- `timeline.currentSlotEnd`：当前节点允许推进到的最晚时间，由系统维护，不得写入。
