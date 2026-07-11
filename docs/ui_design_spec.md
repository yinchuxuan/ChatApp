# Electron UI 设计规范

## 一、配色系统
| 角色 | 浅色模式 | 深色模式 (data-theme="dark") |
|------|----------|------|
| Primary | #006494 | #60A5FA (Blue) |
| Secondary | #00838F | #60A5FA (统一蓝色) |
| Surface | #FFFFFF | #0F172A (Zinc) |
| On-Surface | #1C1B1F | #F1F5F9 |
| Success | #2E7D32 | #4ADE80 |
| Error | #B3261E | #FCA5A5 |
| Outline/Divider | #E0E0E0 | #475569 / #1E293B |

禁止: 紫色渐变、霓虹色、荧光色

## 二、字体规范
字体族: 'Google Sans Display' / 'Google Sans' / sans-serif，代码 'Roboto Mono'
| 层级 | 大小 | 字重 |
|------|------|------|
| Headline | 24-32px | 600 |
| Title | 16-22px | 500 |
| Body | 14-16px | 400 |
| Label | 11-14px | 500 |

## 三、布局与圆角
- 窗口: 800-1920px 响应式 | 圆角: 卡片12px / 按钮8px / 输入框12px
- 间距: 4/8/12/16/24/28px grid

## 四、交互与动效
- 状态层: Hover 8% / Focus 12% / Pressed 12% 透明度
- 动画: Emphasized easing, 200-300ms, 含 subtle-pulse / gradient-flow / fade-scale-in
- Header 底部渐变进度条: primary → secondary 8s 循环流动
- Elevation: 5级阴影系统 (dark/light 独立)

## 五、可访问性 (WCAG AA)
- 对比度: 正文 ≥4.5:1 / 大文本 ≥3:1
- Focus: 2px outline | 点击区域 ≥44×44px
