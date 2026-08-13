# Git 工作流

## 1. GitFlow

```
main ← release ← develop ← feature
                ← hotfix
```

| 分支 | 用途 |
|------|------|
| main | 生产环境 |
| develop | 开发主线 |
| feature/* | 功能开发 |
| release/* | 发布准备 |
| hotfix/* | 紧急修复 |

## 2. Trunk-Based

```
main ← feature (短生命周期)
```

- 所有开发在 main 分支
- 短生命周期 feature 分支
- 持续集成

## 3. 选择建议

| 模型 | 适用场景 |
|------|---------|
| GitFlow | 版本发布、大型团队 |
| Trunk-Based | 持续交付、小团队 |

## 4. Commit 规范

```
<type>(<scope>): <subject>

feat: 新功能
fix: Bug 修复
docs: 文档
style: 格式
refactor: 重构
test: 测试
chore: 构建/工具
```

---
*待补充：更多 Git 工作流*
