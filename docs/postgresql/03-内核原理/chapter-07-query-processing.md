# 查询处理流程

## 1. 完整流程

```
SQL → Parser → Analyzer → Rewriter → Planner/Optimizer → Executor → 结果
```

## 2. 各阶段说明

| 阶段 | 说明 |
|------|------|
| Parser | 语法检查，生成语法树 |
| Analyzer | 语义检查，解析表名/列名 |
| Rewriter | 规则重写（视图展开） |
| Planner | 生成执行计划，选择最优路径 |
| Executor | 执行计划，返回结果 |

## 3. EXPLAIN 解读

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25;

-- 输出示例：
-- Seq Scan on users  (cost=0.00..15.00 rows=500 width=...)
--   Filter: (age > 25)
--   Rows Removed by Filter: 500
```

---
*待补充：更多查询处理细节*
