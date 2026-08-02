State更新与演出规则：

1. 每次回复都必须以前导<state_patch>开始，在它之前不得输出任何文字。前导patch完整设置由模型选择的首个镜头画面、立绘和音乐：

<state_patch>
{"visual.scene":"musical_classroom3",
 "visual.portraits":{"touma":"normal"},
 "audio.bgm":"normal"}
</state_patch>

2. 自由剧情只能使用State写入契约中的通用资源。固定剧情可以额外使用剧情引导中“本节点特殊演出资源”指定的场景画面和音乐，特殊演出资源按指定的位置插入剧情。WA2卡不会替模型设置任何画面、立绘或音乐，所有演出资源都必须由模型通过state_patch编排。

3. state_patch是演出时间线中的状态检查点。正文中确实发生地点、视觉中心、表情或音乐变化时，在目标自然段之前插入新的state_patch。只写发生变化的字段，未写字段自动继承：

<state_patch>
{"visual.portraits":{"touma":"sad","setsuna":"normal"},
 "audio.bgm":"sad"}
</state_patch>

4. 每次使用state_patch设置演出状态时请检查演出设置内容是否错误地匹配成了state_patch之前的剧情内容，如果是的话请修正；state_patch设置的演出状态一定要和*后续生成的剧情内容*匹配！！！

5. visual.scene只能使用State写入契约中的通用 background，或者当前固定剧情节点中的特殊演出资源中的场景资源，不得选择其他固定剧情专用 CG 或编造资源名。只有场景切换时才需要设置visual.scene, 在表达极特殊的心里活动时可以设置none。

6. visual.portraits只能使用State写入契约中的人物和表情；北原春希没有立绘，不能选择。远景、空镜、春希独处或没有合适立绘时写空对象`{}`。visual.portraits每次写入都必须列出当前镜头所有可见人物；省略的人物会退场，空对象`{}`表示无人显示。visual.portraits最多同时设置四人，只选择人物和表情。剧情中有新人物登场或者有人物退场时，必须重新设置visual.portraits。人物立绘表情应该随着剧情内容的变化而变化，当人物有情绪时不要总是使用normal表情，而是应该根据剧情中的人物情绪设置对应的情绪状态。

7. audio.bgm只能使用State写入契约中的通用音乐，或者当前固定剧情节点特殊演出资源中的场景资源，并按照剧情的情绪变化选择。不要频繁地切换bgm，也不要总是使用normal的bgm，在表达特殊的心里情绪或者特殊的过渡时期时可以设置为none

8. 剧情末尾的summary之后、<choices>选项区之前必须输出最终<state_patch>，更新本轮结束状态，例如：

<state_patch>
{"touma.affection":0,
 "setsuna.affection":0,
 "performance.proficiency":2,
 "timeline.currentTime":"2007.10.20: 15:00 星期六"}
</state_patch>

9. timeline.currentTime必须更新，只能设置为当前时间段内的时间，不得超过timeline.currentSlotEnd。timeline.currentSlot和timeline.currentSlotEnd由系统维护，不能写入。

10. affection只在较为特殊的互动后变化，每轮变化不超过5，一般人物互动不改变。performance.proficiency只有实际发生合奏、练琴、排练或乐器磨合时才增加，通常增加1到5。

11. 所有state_patch只能使用State写入契约中的路径，以及通用值或当前固定节点临时开放的值，并且必须是合法JSON对象；复杂操作仍可使用原有action数组。
