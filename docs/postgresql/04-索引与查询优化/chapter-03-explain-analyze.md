# EXPLAIN/ANALYZE

## 1. 基本用法

```sql
EXPLAIN SELECT * FROM users WHERE age > 25;
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25;  -- 实际执行
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT * FROM users WHERE age > 25;
```

## 2. 执行计划解读

```
Seq Scan on users  (cost=0.00..15.00 rows=500 width=16)
  Filter: (age > 25)
```

- cost：启动代价..总代价
- rows：估计行数
- width：平均行宽（字节）

## 3. 常见扫描方式

| 方式 | 说明 | 适用场景 |
|------|------|---------|
| Seq Scan | 全表扫描 | 小表或无索引 |
| Index Scan | 索引扫描 | 有索引，需回表 |
| Index Only Scan | 仅索引扫描 | 覆盖索引 |
| Bitmap Index Scan | 位图索引扫描 | 多条件组合 |

## 4. 连接方式

| 方式 | 说明 | 适用场景 |
|------|------|---------|
| Nested Loop | 嵌套循环 | 小表驱动大表 |
| Hash Join | 哈希连接 | 等值连接，大表 |
| Merge Join | 归并连接 | 已排序数据 |

---
*待补充：更多 EXPLAIN 技巧*
