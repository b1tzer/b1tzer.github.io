# 常见业务场景

## 1. 审计日志

```sql
-- 使用触发器记录变更
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT,
    operation TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMP DEFAULT NOW()
);
```

## 2. 时序数据

```sql
-- 使用 TimescaleDB
CREATE EXTENSION timescaledb;
SELECT create_hypertable('metrics', 'time');
```

## 3. 多租户

```sql
-- 方案1：行级隔离
ALTER TABLE orders ADD COLUMN tenant_id INT;
CREATE POLICY tenant_policy ON orders USING (tenant_id = current_tenant_id());

-- 方案2：Schema 隔离
CREATE SCHEMA tenant_1;
CREATE TABLE tenant_1.orders (...);
```
## 4. 更多业务场景

### 4.1 乐观锁实现

```sql
-- 使用版本号实现乐观锁
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT,
    price DECIMAL(10,2),
    stock INT DEFAULT 100,
    version INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 更新时检查版本号
UPDATE products
SET price = 99.99, version = version + 1, updated_at = NOW()
WHERE id = 1 AND version = 5;

-- 检查影响行数（0 表示版本冲突）
-- 应用层重试
```

### 4.2 软删除

```sql
-- 软删除模式
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    deleted_at TIMESTAMP,  -- NULL 表示未删除
    deleted_by BIGINT
);

-- 创建部分索引（只索引未删除的记录）
CREATE UNIQUE INDEX idx_users_email_active ON users(email)
WHERE deleted_at IS NULL;

-- 软删除
UPDATE users SET deleted_at = NOW(), deleted_by = 123 WHERE id = 1;

-- 查询时自动过滤已删除的记录
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

-- 恢复删除
UPDATE users SET deleted_at = NULL, deleted_by = NULL WHERE id = 1;
```

### 4.3 审计日志

```sql
-- 使用触发器自动记录变更
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,  -- INSERT/UPDATE/DELETE
    record_id BIGINT,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT DEFAULT current_user,
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, operation, record_id, new_data)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_data)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_func();
```

### 4.4 多租户（Schema 隔离）

```sql
-- 每个租户一个 Schema
CREATE SCHEMA tenant_1;
CREATE SCHEMA tenant_2;

-- 在每个 Schema 下创建相同的表结构
CREATE TABLE tenant_1.orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tenant_2.orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 应用层切换 Schema
SET search_path TO tenant_1;
SELECT * FROM orders;  -- 查询 tenant_1 的订单

-- 动态切换
SET search_path TO tenant_2;
SELECT * FROM orders;  -- 查询 tenant_2 的订单
```

### 4.5 时序数据

```sql
-- 使用 TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE metrics (
    time TIMESTAMPTZ NOT NULL,
    device_id INT NOT NULL,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION
);

SELECT create_hypertable('metrics', 'time');

-- 自动压缩 30 天前的数据
ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_id'
);
SELECT add_compression_policy('metrics', INTERVAL '30 days');

-- 自动删除 1 年前的数据
SELECT add_retention_policy('metrics', INTERVAL '1 year');

-- 连续聚合（实时物化视图）
CREATE MATERIALIZED VIEW hourly_metrics
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    device_id,
    AVG(temperature) AS avg_temp,
    MAX(temperature) AS max_temp,
    MIN(temperature) AS min_temp
FROM metrics
GROUP BY bucket, device_id;
```

### 4.6 全文搜索 + 向量搜索

```sql
-- 组合全文搜索和向量搜索
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT,
    content TEXT,
    embedding vector(1536),
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('chinese', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) STORED
);

CREATE INDEX idx_docs_fts ON documents USING GIN (search_vector);
CREATE INDEX idx_docs_vec ON documents USING hnsw (embedding vector_cosine_ops);

-- 全文搜索 + 向量相似度混合排序
SELECT title,
    ts_rank(search_vector, query) AS text_score,
    1 - (embedding <=> $2::vector) AS vec_score
FROM documents, to_tsquery('chinese', $1) AS query
WHERE search_vector @@ query
ORDER BY text_score * 0.3 + (1 - (embedding <=> $2::vector)) * 0.7 DESC
LIMIT 10;
```
