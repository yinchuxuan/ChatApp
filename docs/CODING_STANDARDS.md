# 项目编码规范

**版本**: 2.0 | **最后更新**: 2026-04-28

## 核心规则

| 类别 | 规范 |
|------|------|
| **命名** | 文件 camelCase/PascalCase，组件 PascalCase，IPC kebab-case |
| **组件** | 函数式组件 + React Hooks，props 在参数中直接解构 |
| **State** | useState + useCallback + useEffect 组合，正确声明依赖项 |
| **IPC** | 使用 ipcMain.handle，返回 { success, data/error } 格式 |
| **安全** | contextIsolation: true，nodeIntegration: false |
| **Commit** | 格式: `<type>: <description>`，如 feat: add feature |

## 文件结构

```
harness_lab/
├── main.js        # Electron 主进程
├── preload.js     # 预加载脚本
├── src/           # React 应用
├── test/          # 测试目录
└── docs/          # 文档
```

## 代码规范

- **命名**：变量 camelCase，常量 UPPER_SNAKE_CASE，布尔变量用 is/has 前缀
- **错误处理**：使用 try-catch，返回 { success: false, error: message }
- **React Hooks**：useCallback 缓存函数，useEffect 正确声明依赖
- **IPC**：使用 kebab-case 命名，返回统一格式 { success, data/error }

## 测试规范

- 测试文件命名与被测试文件一致
- 使用 describe 组织测试，test 描述预期行为
- Mock 文件放在 test/__mocks__ 目录

## Git 规范

- feat: 新功能 | fix: bug修复 | chore: 配置 | docs: 文档
- 功能完成后提交，测试通过后提交