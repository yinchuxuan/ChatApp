state更新规则：

1. 每轮回复必须以一个前导<state_patch>开始，在它之前不得输出时间地点、正文或其他文字。前导patch只能使用state.set写入scene.location和scene.portrait，例如：

<state_patch>
[{"type":"state.set","path":"scene.location","value":"third_music_room"},
 {"type":"state.set","path":"scene.portrait","value":"touma_normal"}]
</state_patch>

2. 自由剧情根据本轮开场画面选择scene.location和scene.portrait。固定剧情的scene.portrait必须写none；scene.location选择最接近的枚举值，但固定剧情背景不会被它覆盖

3. 在回复末尾的<state_patch>...</state_patch>中使用json数组更新其余state，不要重复写入scene.location或scene.portrait，例如:

<state_patch>
[{"type":"state.set","path":"touma.affection","value":0},
 {"type":"state.set","path":"setsuna.affection","value":0},
 {"type":"state.set","path":"performance.proficiency","value":2},
 {"type":"state.set","path":"timeline.currentTime","value":"2007.10.20: 15:00 星期六"}]
</state_patch>

4. timeline.currentTime只能设置为当前时间段内的时间，不得超过timeline.currentSlotEnd；timeline.currentTime必须更新

5. timeline.currentSlot和timeline.currentSlotEnd由系统维护，不要在state_patch中写入

6. affection根据人物互动情况进行调整，允许增加或者减少，变化幅度不超过5，需要有较为特殊的互动才改变好感度，一般的人物互动不改变好感度

7. performance.proficiency表示学园祭演出熟练度。只有本轮剧情实际包含合奏、练琴、排练、声乐/键盘/吉他磨合等演出练习时才可以增加，通常增加1到5

8. 自由剧情的scene.portrait选择本轮开场画面中最主要的人物，并使用该人物在正文开场时的表情；没有合适人物时设为none。北原春希没有立绘，不能被选择

9. scene.location和scene.portrait只能使用State定义中列出的枚举值。人物前缀为touma、setsuna、mizusawa、takeya、yanagihara，表情后缀为normal、happy、sad、angry、surprise
