# 内存架构

## 1. 共享内存

| 区域 | 参数 | 说明 |
|------|------|------|
| Shared Buffer | shared_buffers | 数据页缓存 |
| WAL Buffer | wal_buffers | WAL 日志缓存 |
| CLOG | - | 事务提交状态 |
| Lock Table | max_locks_per_transaction | 锁信息 |

## 2. 本地内存

| 区域 | 参数 | 说明 |
|------|------|------|
| Work Memory | work_mem | 排序/哈希操作 |
| Maintenance Work Memory | maintenance_work_mem | VACUUM/CREATE INDEX |
| Temp Buffers | temp_buffers | 临时表缓存 |

## 3. 缓冲区管理

```sql
-- 查看缓冲区命中率
SELECT 
    sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) AS hit_ratio
FROM pg_stat_database;
```

---
## 4. 共享内存详解

### 4.1 Shared Buffer 管理

Shared Buffer 是 PG 最重要的内存区域，缓存数据页以减少磁盘 IO。

```sql
-- 查看缓冲区命中率（应 > 99%）
SELECT
    sum(blks_hit) AS hits,
    sum(blks_read) AS reads,
    ROUND(sum(blks_hit) * 100.0 / sum(blks_hit + blks_read), 2) AS hit_ratio
FROM pg_stat_database;

-- 查看各表的缓冲区使用情况
SELECT
    relname,
    blks_read,
    blks_hit,
    ROUND(blks_hit * 100.0 / NULLIF(blks_hit + blks_read, 0), 2) AS hit_ratio
FROM pg_stat_user_tables
ORDER BY blks_read DESC
LIMIT 20;

-- 查看缓冲区分配详情
SELECT
    c.relname,
    count(*) AS buffers,
    pg_size_pretty(count(*) * 8192) AS buffer_size
FROM pg_buffercache b
JOIN pg_class c ON b.relfilenode = c.relfilenode
WHERE b.reldatabase = (SELECT oid FROM pg_database WHERE datname = current_database())
GROUP BY c.relname
ORDER BY buffers DESC
LIMIT 20;
```

### 4.2 CLOG（事务提交日志）

CLOG 记录每个事务的提交状态（已提交/已回滚/进行中），用于判断行的可见性。

```sql
-- 查看事务 ID 年龄（接近 2^31 时需要 VACUUM FREEZE）
SELECT datname, age(datfrozenxid)
FROM pg_database
ORDER BY age(datfrozenxid) DESC;

-- 查看当前事务信息
SELECT txid_current();
SELECT txid_current_snapshot();
```

### 4.3 Lock Table

锁表存储所有锁信息，`max_locks_per_transaction` 控制每个事务平均可用的锁数量。

```sql
-- 查看当前锁信息
SELECT locktype, relation::regclass, mode, granted, pid
FROM pg_locks
WHERE relation IS NOT NULL
ORDER BY relation, mode;

-- 查看锁等待关系
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
JOIN pg_locks kl ON kl.locktype = bl.locktype
    AND kl.database IS NOT DISTINCT FROM bl.database
    AND kl.relation IS NOT DISTINCT FROM bl.relation
    AND kl.pid != bl.pid AND kl.granted
JOIN pg_stat_activity blocking ON blocking.pid = kl.pid;
```

## 5. 本地内存详解

### 5.1 Work Memory 调优

```sql
-- 查看当前 work_mem
SHOW work_mem;

-- 在事务内临时调大（不影响其他连接）
BEGIN;
SET LOCAL work_mem = '256MB';
EXPLAIN ANALYZE SELECT * FROM large_table ORDER BY id;
COMMIT;

-- 查看查询是否溢出到磁盘（Sort/Hash 操作）
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM large_table ORDER BY id;
-- 如果看到 "Sort Method: external merge Disk: xxxkB" 说明 work_mem 不足
```

### 5.2 Maintenance Work Memory

```sql
-- 查看当前值
SHOW maintenance_work_mem;

-- 临时调大以加速 CREATE INDEX
SET maintenance_work_mem = '2GB';
CREATE INDEX idx_large_table ON large_table(created_at);

-- 临时调大以加速 VACUUM
SET maintenance_work_mem = '2GB';
VACUUM ANALYZE large_table;
```

## 6. 内存配置最佳实践

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| shared_buffers | 物理内存的 25% | 过大反而增加 checkpoint 压力 |
| effective_cache_size | 物理内存的 75% | 只影响优化器估算，不实际分配内存 |
| work_mem | 4-64MB | 连接数 × 并发操作数 × work_mem 不能超过可用内存 |
| maintenance_work_mem | 512MB-2GB | 只在维护操作时使用，可以设大 |
| wal_buffers | -1（自动） | 通常为 shared_buffers 的 1/32 |

> **监控要点**：定期检查缓冲区命中率，低于 99% 说明 shared_buffers 可能不足；检查 EXPLAIN 输出中是否有 Sort/Hash 溢出磁盘，说明 work_mem 不足。
