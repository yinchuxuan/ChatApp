state更新规则：

1. 在回复末尾的<state_patch>...</state_patch>中使用json数组更新state,例如:

<state_patch>
[{"type":"state.set","path":"touma.affection","value":0},
 {"type":"state.set","path":"setsuna.affection","value":0},
 {"type":"state.set","path":"performance.proficiency","value":2},
 {"type":"state.set","path":"timeline.currentTime","value":"2007.10.20: 15:00 星期六"}]
</state_patch>

2. timeline.currentTime只能设置为当前时间段内的时间，不得超过timeline.currentSlotEnd；timeline.currentTime必须更新

3. timeline.currentSlot和timeline.currentSlotEnd由系统维护，不要在state_patch中写入

4. affection根据人物互动情况进行调整，允许增加或者减少，变化幅度不超过5，需要有较为特殊的互动才改变好感度，一般的人物互动不改变好感度

5. performance.proficiency表示学园祭演出熟练度。只有本轮剧情实际包含合奏、练琴、排练、声乐/键盘/吉他磨合等演出练习时才可以增加，通常增加1到5
