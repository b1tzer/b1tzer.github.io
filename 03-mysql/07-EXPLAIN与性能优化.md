# EXPLAIN 与性能优化

> **核心问题**：如何用 EXPLAIN 分析 SQL 性能？有哪些常见的 SQL 优化手段？

---

## 它解决了什么问题？

SQL 写完了，但不知道是否高效？EXPLAIN 是 MySQL 自带的执行计划分析工具，能告诉你：
- SQL 是否走了索引
- 预估扫描了多少行
- 是否有文件排序、临时表等性能问题

---

## EXPLAIN 关键字段

```sql
EXPLAIN SELECT * FROM user WHERE name = 'Tom' AND age > 18;
```

| 字段 | 含义 | 重点关注值 |
|------|------|-----------|
| **type** | 访问类型（性能从好到差） | `system > const > eq_ref > ref > range > index > ALL` |
| **key** | 实际使用的索引 | NULL 表示未使用索引 |
| **key_len** | 索引使用的字节数 | 越长说明使用了更多索引列 |
| **rows** | 预估扫描行数 | 越小越好 |
| **Extra** | 额外信息 | `Using index`（覆盖索引）、`Using filesort`（需优化）、`Using temporary`（需优化） |

---

## type 类型详解

```
system      → 表只有一行（系统表）
const       → 主键或唯一索引等值查询，最多一行（最优）
eq_ref      → JOIN 时使用主键或唯一索引
ref         → 普通索引等值查询
range       → 索引范围查询（BETWEEN、>、<、IN）
index       → 全索引扫描（比 ALL 好，但仍需关注）
ALL         → 全表扫描（⚠️ 需要优化）
```

```mermaid
flowchart LR
    system --> const --> eq_ref --> ref --> range --> index --> ALL
    style system fill:#90EE90
    style const fill:#90EE90
    style eq_ref fill:#90EE90
    style ref fill:#90EE90
    style range fill:#FFD700
    style index fill:#FFA500
    style ALL fill:#FF6B6B
```

---

## Extra 字段含义

| Extra 值 | 含义 | 是否需要优化 |
|---------|------|------------|
| `Using index` | 覆盖索引，无需回表 | ✅ 很好 |
| `Using where` | 在索引扫描后还需过滤 | ⚠️ 可接受 |
| `Using filesort` | 需要额外排序（无法利用索引排序） | ⚠️ 需优化 |
| `Using temporary` | 使用了临时表（GROUP BY、DISTINCT 等） | ⚠️ 需优化 |
| `Using index condition` | 索引下推（ICP），减少回表次数 | ✅ 较好 |

---

## 常见优化案例

### 案例1：函数导致全表扫描

```sql
-- ❌ 问题 SQL：全表扫描
SELECT * FROM orders WHERE YEAR(create_time) = 2024;
-- EXPLAIN 显示 type=ALL

-- ✅ 优化后：范围查询走索引
SELECT * FROM orders
WHERE create_time >= '2024-01-01' AND create_time < '2025-01-01';
-- EXPLAIN 显示 type=range
```

### 案例2：SELECT * 导致回表

```sql
-- ❌ 问题 SQL：SELECT * 导致回表
SELECT * FROM user WHERE name = 'Tom';
-- EXPLAIN 显示 Extra 无 Using index

-- ✅ 优化后：覆盖索引，避免回表
SELECT id, name, age FROM user WHERE name = 'Tom';
-- 如果有联合索引 (name, age)，EXPLAIN 显示 Extra=Using index
```

### 案例3：ORDER BY 导致文件排序

```sql
-- ❌ 问题 SQL：排序字段不在索引中
SELECT * FROM user WHERE status = 1 ORDER BY create_time DESC;
-- EXPLAIN 显示 Extra=Using filesort

-- ✅ 优化后：建立联合索引 INDEX(status, create_time)
-- EXPLAIN 显示 Extra=Using index condition（无 filesort）
```

---

## SQL 优化技巧汇总

| 优化方向 | 具体做法 |
|---------|---------|
| **避免全表扫描** | 给 WHERE 条件列建索引，避免索引失效 |
| **避免回表** | 使用覆盖索引，SELECT 只查需要的列 |
| **避免文件排序** | ORDER BY 的列加入联合索引 |
| **减少扫描行数** | 精确查询条件，避免 `SELECT *` |
| **分页优化** | 大偏移量分页用延迟关联（先查主键，再 JOIN） |
| **批量操作** | 批量 INSERT 比逐条 INSERT 快 10 倍以上 |

### 大偏移量分页优化

```sql
-- ❌ 深分页，offset 很大时性能极差（需要扫描并丢弃大量数据）
SELECT * FROM orders ORDER BY id LIMIT 1000000, 10;

-- ✅ 延迟关联：先用覆盖索引查主键，再 JOIN 获取完整数据
SELECT o.* FROM orders o
INNER JOIN (
    SELECT id FROM orders ORDER BY id LIMIT 1000000, 10
) t ON o.id = t.id;
```

---

## 慢查询日志

```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;  -- 超过 1 秒的查询记录到日志

-- 查看慢查询日志位置
SHOW VARIABLES LIKE 'slow_query_log_file';

-- 用 mysqldumpslow 分析慢查询日志
-- mysqldumpslow -s t -t 10 /path/to/slow.log
-- -s t: 按查询时间排序
-- -t 10: 显示前 10 条
```

---

## 面试高频问题

**Q：EXPLAIN 中最重要的字段是什么？type=ALL 意味着什么？**

> 最重要的是 `type`、`key`、`rows`、`Extra`。`type=ALL` 表示全表扫描，是性能最差的访问方式，需要检查索引是否建立或是否失效。

**Q：如何优化深分页查询？**

> 使用延迟关联：先用覆盖索引查出主键列表（速度快），再用主键 JOIN 获取完整数据，避免大偏移量扫描大量数据后丢弃。

**Q：Extra 中出现 Using filesort 怎么优化？**

> `Using filesort` 说明排序无法利用索引，需要额外排序。优化方法：将 ORDER BY 的列加入联合索引，且索引列顺序与 ORDER BY 顺序一致。