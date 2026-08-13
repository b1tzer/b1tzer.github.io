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
*待补充：更多分区场景*
