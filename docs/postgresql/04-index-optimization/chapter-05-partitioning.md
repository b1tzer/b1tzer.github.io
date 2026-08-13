# 表分区

## 1. 范围分区

```sql
CREATE TABLE orders (
    id BIGSERIAL,
    user_id BIGINT,
    amount DECIMAL(10,2),
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

CREATE TABLE orders_2024 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE orders_2025 PARTITION OF orders
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

## 2. 列表分区

```sql
CREATE TABLE users (
    id BIGSERIAL,
    name VARCHAR(50),
    region VARCHAR(20)
) PARTITION BY LIST (region);

CREATE TABLE users_north PARTITION OF users FOR VALUES IN ('north');
CREATE TABLE users_south PARTITION OF users FOR VALUES IN ('south');
```

## 3. 哈希分区

```sql
CREATE TABLE logs (
    id BIGSERIAL,
    message TEXT
) PARTITION BY HASH (id);

CREATE TABLE logs_0 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE logs_1 PARTITION OF logs FOR VALUES WITH (MODULUS 4, REMAINDER 1);
```

## 4. 分区裁剪

```sql
-- 只扫描相关分区
EXPLAIN SELECT * FROM orders WHERE created_at = '2024-06-01';
-- 输出：orders_2024
```

---
## 5. 分区管理与最佳实践

### 5.1 自动创建分区

```sql
-- 使用 pg_partman 扩展自动管理分区
CREATE EXTENSION pg_partman;

-- 配置自动分区
SELECT partman.create_parent(
    p_parent_table := 'public.orders',
    p_control := 'created_at',
    p_type := 'range',
    p_interval := '1 month',
    p_premake := 3  -- 提前创建 3 个未来分区
);

-- 运行分区维护（通常通过 pg_cron 定时执行）
SELECT partman.run_maintenance();
```

### 5.2 分区裁剪验证

```sql
-- 确认分区裁剪是否生效
EXPLAIN SELECT * FROM orders WHERE created_at = '2024-06-15';
-- 应该只扫描 orders_2024 分区

-- 查看扫描了哪些分区
EXPLAIN (VERBOSE)
SELECT * FROM orders WHERE created_at BETWEEN '2024-06-01' AND '2024-06-30';

-- 强制禁用分区裁剪（调试用）
SET enable_partition_pruning = off;
EXPLAIN SELECT * FROM orders WHERE created_at = '2024-06-15';
SET enable_partition_pruning = on;
```

### 5.3 分区表的索引

```sql
-- 在父表上创建索引会自动在所有分区上创建
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 查看各分区的索引
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS index_size
FROM pg_indexes
WHERE tablename LIKE 'orders%'
ORDER BY tablename, indexname;

-- 分区表上创建唯一索引（必须包含分区键）
CREATE UNIQUE INDEX idx_orders_id_created ON orders(id, created_at);
```

### 5.4 分区合并与拆分

```sql
-- 合并分区（将多个分区合并为一个）
ALTER TABLE orders DETACH PARTITION orders_2024;
-- 手动合并数据后重新附加
ALTER TABLE orders ATTACH PARTITION orders_2024
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- 拆分分区
ALTER TABLE orders DETACH PARTITION orders_2024;
CREATE TABLE orders_2024_h1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-07-01');
CREATE TABLE orders_2024_h2 PARTITION OF orders
    FOR VALUES FROM ('2024-07-01') TO ('2025-01-01');
```

### 5.5 分区与 VACUUM

```sql
-- 对单个分区执行 VACUUM（不影响其他分区）
VACUUM orders_2024;

-- 查看各分区的膨胀情况
SELECT
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_stat_user_tables
WHERE relname LIKE 'orders%'
ORDER BY n_dead_tup DESC;
```

### 5.6 分区最佳实践

| 实践 | 说明 |
|------|------|
| **分区键选择** | 选择查询频率最高的过滤条件（通常是时间或地区） |
| **分区粒度** | 时间分区建议月分区（日分区过多，年分区过少） |
| **索引策略** | 分区表索引应该包含分区键，支持分区裁剪 |
| **自动管理** | 使用 pg_partman 自动创建和清理分区 |
| **旧分区处理** | 旧分区可以 DETACH 后归档或删除，比 DELETE 快得多 |
| **唯一约束** | 分区表的唯一索引必须包含分区键 |

> **什么时候用分区**：表超过 1 亿行、需要快速删除旧数据、查询总带有时间/地区过滤条件。分区不是万能的，小表分区反而增加复杂度。
