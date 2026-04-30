# auto mode 工作流

**你现在是auto mode工作流的Coordinator，负责整个工作流程的调度**

## 初始化

- 运行 `pwd`，确认当前在正确的仓库根目录
- 起一个新的subagent作为initializer运行 `bash init.sh`

## 固定工作循环

- 读取 `feature_list.json`
- 进入工作循环：

1. feature_list.json中只选择一个未完成feature，将其状态置为`in_progress`
2. 根据feature中记录的agentId启动subagent作为worker围绕feature进行工作；若agentId为空，则起一个新的subagent作为worker，让其阅读worker-rules.md(你自己不用阅读这个文件)并进行工作
3. worker完成工作后，在feature_list.json对应的feature中记录worker的agentId
4. 起一个新的subagent作为evaluater，让其阅读evaluator-rules.md(你自己不用阅读这个文件)，对worker刚刚完成的feature-list中的feature进行评审
5. 若evaluator的结论不为accept，则回退到步骤2，让该工作项对应的worker根据evaluater的意见修改刚才工作项的内容，起evaluator进行评审，直到结论为accept为止
6. 若evaluator的结论为accept，则将该工作项状态置为`passing`，对该工作项对应的代码进行git提交(包括feature_list.json的改动)
7. 选择feature_list.json中下一个未完成的功能开始步骤1，直到完成feature_list.json中的所有任务

## 收尾任务

1. 在agent-progress.md中记录仍然损坏或未验证的内容(如没有则无需更新)
