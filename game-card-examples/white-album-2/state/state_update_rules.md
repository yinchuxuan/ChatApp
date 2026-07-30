State更新与演出规则：

1. 自由剧情的回复必须以前导<state_patch>开始，在它之前不得输出任何文字。前导patch使用state.set直接设置首个镜头的背景、立绘和音乐：

<state_patch>
{"visual.background":"musical_classroom3",
 "visual.portrait":"touma_normal",
 "audio.bgm":"WA_piano"}
</state_patch>

2. 固定剧情的背景和音乐由剧情引导预设，不要在开头覆盖visual.background或audio.bgm；需要显示人物时可以设置visual.portrait，否则保持none。

3. state_patch是演出时间线中的状态检查点。正文中确实发生地点、视觉中心、表情或音乐变化时，在目标自然段之前插入新的state_patch。只写发生变化的字段，未写字段自动继承：

<state_patch>
{"visual.portrait":"touma_sad",
 "audio.bgm":"sad"}
</state_patch>

4. 不要为了每次说话或每个自然段切换演出。背景只随实际地点或镜头变化；立绘代表当前视觉中心，不等于最后说话的人；表情只在明显情绪转折时变化；音乐没有明显情绪转折时保持当前值。远景、空镜、春希独处或没有合适立绘时使用visual.portrait=none。

5. 背景只能使用State定义中的值：musical_classroom3第三音乐室；rooftop或rooftop2天台；school校园公共区域；classroom普通教室；park公园；ktv卡拉OK；home_party住宅聚会。

6. 立绘人物前缀为touma、setsuna、mizusawa、takeya、yanagihara，表情后缀为normal、happy、sad、angry、surprise。北原春希没有立绘，不能选择。

7. 音乐按场景克制选择：none静音留白；daily轻松日常；happy明确喜悦；normal平稳交流；sad克制伤感；tragic激烈冲突；WA_piano钢琴与回忆；WA_3重要主题；dream朦胧憧憬；snow_scene冬日寂静；bad_woman危险暧昧；after_all_piano事后余韵；winter_night冬夜孤独；things沉重思考；unstoppable_dream情绪决堤；love_dream温柔恋爱情绪。

8. 剧情末尾的summary之后、ABCD选项之前必须输出最终<state_patch>，更新本轮结束状态，例如：

<state_patch>
{"touma.affection":0,
 "setsuna.affection":0,
 "performance.proficiency":2,
 "timeline.currentTime":"2007.10.20: 15:00 星期六"}
</state_patch>

9. timeline.currentTime必须更新，只能设置为当前时间段内的时间，不得超过timeline.currentSlotEnd。timeline.currentSlot和timeline.currentSlotEnd由系统维护，不能写入。

10. affection只在较为特殊的互动后变化，每轮变化不超过5，一般人物互动不改变。performance.proficiency只有实际发生合奏、练琴、排练或乐器磨合时才增加，通常增加1到5。

11. 所有state_patch只能使用State定义中的路径和值，并且必须是合法JSON对象；复杂操作仍可使用原有action数组。
