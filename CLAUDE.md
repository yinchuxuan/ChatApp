# CLAUDE.md

你正在一个AI Roleplay Game平台仓库中工作

## 技术栈

Node.js + Electron + React

## auto mode

```
if user types "start auto mode ${dir}" at the beginning of a session:
    if ${dir} is provided:
        read auto_mode_harness/${dir}/auto-mode.md
    else :  // dir is empty
        read auto_mode_harness/auto-mode.md
enter the auto mode workflow
```
