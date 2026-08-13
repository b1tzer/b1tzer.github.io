# 索引优化实践

## 1. 索引下推 (ICP)

```sql
-- MySQL 5.6+ 自动启用
SELECT * FROM users WHERE name LIKE '张%' AND age = 25;
-- 在 idx_name_age 索引层直接过滤 age，减少回表
```

## 2. MRR (Multi-Range Read)

```sql
-- 优化随机 IO
SELECT * FROM users WHERE age BETWEEN 20 AND 30;
-- 先收集主键，排序后顺序回表
```

## 3. 索引合并

```sql
-- 多个索引条件交集
SELECT * FROM users WHERE name = '张三' AND age = 25;
-- 可能同时使用 idx_name 和 idx_age
```

## 4. 优化建议

1. 优先使用覆盖索引
2. 联合索引把选择性高的列放前面
3. 避免过多索引（影响写入性能）
4. 定期分析索引使用情况

```sql
-- 查看未使用的索引
SELECT * FROM sys.schema_unused_indexes;
```

---
*待补充：更多索引优化场景*
