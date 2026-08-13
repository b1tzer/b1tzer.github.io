# EXPLAIN 详解

## 1. 基本用法

```sql
EXPLAIN SELECT * FROM users WHERE age > 25;
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25;  -- 8.0+
```

## 2. 核心字段

| 字段 | 说明 |
|------|------|
| type | 访问类型 |
| possible_keys | 可能使用的索引 |
| key | 实际使用的索引 |
| key_len | 索引使用长度 |
| rows | 预估扫描行数 |
| filtered | 过滤比例 |
| Extra | 额外信息 |

## 3. type 访问类型（从差到好）

| type | 说明 |
|------|------|
| ALL | 全表扫描 |
| index | 全索引扫描 |
| range | 范围扫描 |
| ref | 非唯一索引等值查询 |
| eq_ref | 唯一索引等值查询 |
| const | 主键/唯一索引等值查询 |
| system | 系统表 |

## 4. Extra 常见值

| Extra | 说明 |
|------|------|
| Using index | 覆盖索引 |
| Using where | 存储引擎返回后再过滤 |
| Using temporary | 使用临时表 |
| Using filesort | 文件排序 |
| Using index condition | 索引下推 |

---
*待补充：更多 EXPLAIN 技巧*
