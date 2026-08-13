# 并发控制实践

## 1. 热点行处理

```sql
-- 使用 SELECT FOR UPDATE
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

## 2. 乐观锁

```sql
-- 使用版本号
UPDATE products 
SET stock = stock - 1, version = version + 1 
WHERE id = 1 AND version = 5;

-- 检查影响行数，0 表示冲突
```

## 3. 批量更新

```sql
-- 使用 CTE 批量更新
WITH batch AS (
    SELECT id FROM orders WHERE status = 'pending' LIMIT 1000
)
UPDATE orders SET status = 'processing' 
WHERE id IN (SELECT id FROM batch);
```

---
## 4. 更多并发场景

### 4.1 防止重复下单

```sql
-- 方案1：唯一约束（最简单）
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    idempotency_key VARCHAR(64) UNIQUE,  -- 幂等键
    amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 插入时如果幂等键冲突，说明重复提交
INSERT INTO orders (user_id, product_id, idempotency_key, amount)
VALUES (1, 100, 'order-20240615-001', 99.9)
ON CONFLICT (idempotency_key) DO NOTHING;

-- 方案2：咨询锁（防止并发操作）
BEGIN;
SELECT pg_advisory_xact_lock(user_id);  -- 用户级别互斥
-- 检查库存、创建订单...
INSERT INTO orders (user_id, product_id, amount) VALUES (1, 100, 99.9);
COMMIT;
```

### 4.2 库存扣减（乐观锁）

```sql
-- 乐观锁：使用版本号
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT,
    stock INT DEFAULT 100,
    version INT DEFAULT 0
);

-- 扣减库存（乐观锁）
UPDATE products
SET stock = stock - 1, version = version + 1
WHERE id = 1 AND stock > 0 AND version = 5;

-- 检查影响行数
-- 如果影响 0 行，说明库存不足或版本冲突，需要重试
```

### 4.3 分布式 ID 生成

```sql
-- 方案1：序列（Sequence）
CREATE SEQUENCE order_id_seq;
SELECT nextval('order_id_seq');

-- 方案2：时序 ID（类似 Snowflake）
CREATE OR REPLACE FUNCTION generate_snowflake_id()
RETURNS BIGINT AS $$
DECLARE
    epoch BIGINT := 1609459200000;  -- 2021-01-01 00:00:00 UTC
    now_ms BIGINT;
    seq INT;
BEGIN
    now_ms := EXTRACT(EPOCH FROM clock_timestamp()) * 1000;
    seq := nextval('snowflake_seq') % 4096;
    RETURN ((now_ms - epoch) << 22) | (1 << 12) | seq;
END;
$$ LANGUAGE plpgsql;

-- 方案3：UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
INSERT INTO orders (id, user_id) VALUES (uuid_generate_v4(), 1);
```

### 4.4 读写分离

```sql
-- 配置流复制后，应用层路由读写请求
-- 写请求 → 主库
-- 读请求 → 从库（可能有延迟）

-- 在 PG 中查看复制延迟
SELECT
    client_addr,
    state,
    sent_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- 应用层配置（Spring Boot）
spring:
  datasource:
    write:
      url: jdbc:postgresql://master:5432/mydb
    read:
      url: jdbc:postgresql://slave:5432/mydb
```

### 4.5 批量插入与 UPSERT

```sql
-- 批量 UPSERT（INSERT ON CONFLICT）
INSERT INTO user_stats (user_id, login_count, last_login)
VALUES
    (1, 1, NOW()),
    (2, 1, NOW()),
    (3, 1, NOW())
ON CONFLICT (user_id)
DO UPDATE SET
    login_count = user_stats.login_count + EXCLUDED.login_count,
    last_login = EXCLUDED.last_login;

-- 批量插入（使用 COPY 最快）
COPY users (name, email) FROM STDIN WITH (FORMAT csv);
user1,user1@example.com
user2,user2@example.com
\.
```

### 4.6 并发安全的计数器

```sql
-- ❌ 不安全：并发下可能丢失更新
UPDATE counters SET value = value + 1 WHERE name = 'page_views';

-- ✅ 安全：UPDATE 本身是原子操作
UPDATE counters SET value = value + 1 WHERE name = 'page_views';
-- PG 的 UPDATE 是原子的，不会丢失更新

-- ✅ 使用 RETURNING 获取更新后的值
UPDATE counters SET value = value + 1
WHERE name = 'page_views'
RETURNING value;

-- ✅ 高并发场景：使用 CTE 批量计数
WITH new_counts AS (
    SELECT name, count(*) AS cnt
    FROM page_view_logs
    WHERE created_at > (SELECT MAX(last_processed) FROM counter_sync)
    GROUP BY name
)
UPDATE counters c
SET value = c.value + nc.cnt
FROM new_counts nc
WHERE c.name = nc.name;
```
