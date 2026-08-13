# 查询执行流程

## 1. 完整流程

```
SQL → 连接器 → 查询缓存(8.0移除) → 解析器 → 优化器 → 执行器 → 存储引擎
```

## 2. 优化器

```sql
-- 查看优化器选择
EXPLAIN FORMAT=JSON SELECT * FROM users WHERE age > 25;

-- Optimizer Trace
SET optimizer_trace = 'enabled=on';
SELECT * FROM users WHERE age > 25;
SELECT * FROM information_schema.optimizer_trace\G
```

## 3. 成本模型

```sql
-- 查看表统计信息
SELECT * FROM mysql.innodb_table_stats WHERE table_name = 'users';

-- 更新统计信息
ANALYZE TABLE users;
```

---
*待补充：更多优化器细节*
