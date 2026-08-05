# State 写入契约

只能在 `<state_patch>` 中写入本契约列出的路径。路径名必须完全匹配；场景画面和音乐通常只能使用下列通用值。固定剧情引导可以额外提供仅限当前节点使用的画面和音乐值，离开该节点后不得继续选择。未列出的 State 一律不得修改。

## 剧情结算字段

- `touma.affection`：冬马和纱对春希的好感度。数值范围为 0～100；只有特殊互动才变化，单轮变化不超过 5。
- `setsuna.affection`：小木曾雪菜对春希的好感度。数值范围为 0～100；只有特殊互动才变化，单轮变化不超过 5。
- `performance.proficiency`：学园祭演出熟练度，数值范围为 0～100。只有实际发生合奏、练琴、排练、声乐、键盘或吉他磨合等演出练习时才增加，通常增加 1～5。
- `timeline.currentTime`：本轮正文结束时的剧情时间，格式必须为 `YYYY.MM.DD: HH:mm 星期X`，且不得晚于当前的 `timeline.currentSlotEnd`。

## 演出切换字段

- `visual.scene`：当前镜头的基础画面。通用场景必须先根据后续正文实际发生的地点选择场景，再根据该场景的当前局部时段使用下表中的“场景名 + 时段”完整值。固定剧情临时开放的专用 CG 直接使用剧情引导给出的资源名，不要追加 morning、afternoon 或 night 后缀。
- `visual.portraits`：当前镜头所有可见人物到表情的完整映射，最多四人。人物可写 `touma`（冬马和纱）、`setsuna`（小木曾雪菜）、`mizusawa`（水泽依绪）、`takeya`（饭冢武也）、`chikashi`（早坂亲志）、`yanagihara`（柳原朋）；所有人物的表情可写 `normal`（平静自然）、`happy`（开心喜悦）、`sad`（悲伤失落）、`cry`（哭泣落泪）、`angry`（生气愤怒）、`surprise`（惊讶意外）、`joy`（兴奋欢笑）、`sweating_smile`（尴尬冒汗地笑）。例如 `{"touma":"sad","setsuna":"normal"}`。位置和大小由平台自动编排，不要输出位置。北原春希没有立绘；远景、空镜、春希独处或没有合适立绘时写 `{}`。
- `audio.bgm`：当前镜头音乐。通用可写值：`daily`（轻松日常）、`happy`（喜悦开心）、`normal`（情绪舒缓）、`sad`（克制伤感）、`tragic`（激烈冲突）。

### 通用 background

时段严格按镜头所处的剧情时间判断：05:00～11:59 使用 morning，12:00～17:59 使用 afternoon，18:00～次日 04:59 使用 night。地点不变但剧情跨入另一时段时，也要切换为对应版本。

| 场景语义 | morning | afternoon | night |
| --- | --- | --- | --- |
| 北原春希的出租屋室内 | `apartment_morning` | `apartment_afternoon` | `apartment_night` |
| 峰城大附属的普通教室（含各班教室） | `classroom_morning` | `classroom_afternoon` | `classroom_night` |
| 峰城大附属教学楼走廊 | `corridor_morning` | `corridor_afternoon` | `corridor_night` |
| 峰城大附属第三音乐教室 | `musical_classroom3_morning` | `musical_classroom3_afternoon` | `musical_classroom3_night` |
| 峰城大附属校园、校舍外部 | `school_morning` | `school_afternoon` | `school_night` |
| 小木曾雪菜的卧室 | `setsuna_room_morning` | `setsuna_room_afternoon` | `setsuna_room_night` |
| 峰城大附属教学楼楼梯 | `stairs_morning` | `stairs_afternoon` | `stairs_night` |
| 住宅区或城市街道 | `street_morning` | `street_afternoon` | `street_night` |
| 车站站台 | `subway_station_morning` | `subway_station_afternoon` | `subway_station_night` |

## 只读剧情边界

- `timeline.currentSlot`：当前剧情节点，由系统维护，不得写入。
- `timeline.currentSlotEnd`：当前节点允许推进到的最晚时间，由系统维护，不得写入。
