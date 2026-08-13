# 分区表

## 1. 范围分区

```sql
CREATE TABLE orders (
    id BIGINT,
    user_id BIGINT,
    amount DECIMAL(10,2),
    created_at DATE
) PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION pmax VALUES LESS THAN MAXVALUE
);
```

## 2. 列表分区

```sql
CREATE TABLE users (
    id INT,
    name VARCHAR(50),
    region VARCHAR(20)
) PARTITION BY LIST COLUMNS (region) (
    PARTITION p_north VALUES IN ('north'),
    PARTITION p_south VALUES IN ('south'),
    PARTITION p_east VALUES IN ('east')
);
```

## 3. 哈希分区

```sql
CREATE TABLE logs (
    id BIGINT,
    message TEXT
) PARTITION BY HASH (id) PARTITIONS 4;
```

## 4. 分区裁剪

```sql
-- 只扫描相关分区
EXPLAIN SELECT * FROM orders WHERE created_at = '2024-06-01';
-- 输出：p2024
```

---
*待补充：更多分区场景*
