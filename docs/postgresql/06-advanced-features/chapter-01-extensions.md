# 扩展机制

## 1. 使用扩展

```sql
-- 安装扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 查看已安装
SELECT * FROM pg_extension;

-- 卸载
DROP EXTENSION IF EXISTS "uuid-ossp";
```

## 2. 常用扩展

| 扩展 | 说明 |
|------|------|
| uuid-ossp | UUID 生成 |
| pg_trgm | 模糊搜索 |
| btree_gist | GiST 索引支持 |
| hstore | 键值对 |
| pg_stat_statements | 查询统计 |
| postgis | 空间数据 |
| timescaledb | 时序数据 |
| pgvector | 向量搜索 |

---
## 3. 更多扩展用法

### 3.1 pg_stat_statements（查询统计）

```sql
-- 安装（需要在 postgresql.conf 中配置 shared_preload_libraries）
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 查看最慢的 SQL
SELECT
    calls,
    ROUND(mean_exec_time::numeric, 2) AS avg_ms,
    ROUND(total_exec_time::numeric, 2) AS total_ms,
    LEFT(query, 100) AS query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 查看执行次数最多的 SQL
SELECT calls, LEFT(query, 100) AS query
FROM pg_stat_statements
ORDER BY calls DESC LIMIT 10;

-- 重置统计
SELECT pg_stat_statements_reset();
```

### 3.2 pg_trgm（模糊搜索）

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 创建 GIN 索引支持 LIKE 查询
CREATE INDEX idx_name_trgm ON users USING GIN (name gin_trgm_ops);

-- 模糊查询（走索引）
SELECT * FROM users WHERE name LIKE '%张三%';

-- 相似度搜索
SELECT name, similarity(name, '张三丰') AS score
FROM users
WHERE name % '张三丰'
ORDER BY score DESC;
```

### 3.3 pgvector（向量搜索）

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建向量表
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536)  -- OpenAI embedding 维度
);

-- 插入向量
INSERT INTO documents (content, embedding) VALUES
('PostgreSQL 是一个强大的数据库', '[0.1, 0.2, ...]');

-- 创建向量索引（HNSW，推荐）
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- 相似度搜索（余弦距离）
SELECT content, 1 - (embedding <=> '[0.1, 0.2, ...]') AS similarity
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 10;
```

### 3.4 TimescaleDB（时序数据）

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 创建时序表
CREATE TABLE metrics (
    time TIMESTAMPTZ NOT NULL,
    device_id INT,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION
);

-- 转换为 hypertable
SELECT create_hypertable('metrics', 'time');

-- 自动压缩旧数据（30天后）
ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_id'
);
SELECT add_compression_policy('metrics', INTERVAL '30 days');

-- 自动删除旧数据（保留 1 年）
SELECT add_retention_policy('metrics', INTERVAL '1 year');
```

### 3.5 pg_cron（定时任务）

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 每天凌晨 2 点执行 VACUUM
SELECT cron.schedule('nightly-vacuum', '0 2 * * *', 'VACUUM ANALYZE');

-- 每小时刷新物化视图
SELECT cron.schedule('refresh-mv', '0 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_sales');

-- 查看定时任务
SELECT * FROM cron.job;

-- 删除定时任务
SELECT cron.unschedule('nightly-vacuum');
```

### 3.6 扩展管理最佳实践

```sql
-- 查看可用扩展
SELECT * FROM pg_available_extensions ORDER BY name;

-- 查看已安装扩展
SELECT * FROM pg_extension;

-- 查看扩展需要的共享库
SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';

-- 扩展升级
ALTER EXTENSION pg_stat_statements UPDATE;

-- 查看扩展的 SQL 定义
SELECT pg_catalog.pg_get_functiondef(oid)
FROM pg_proc WHERE proname = 'pg_stat_statements_reset';
```
