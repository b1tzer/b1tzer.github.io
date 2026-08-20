# 监控

## 1. 系统视图

```sql
-- 连接数
SELECT count(*) FROM pg_stat_activity;

-- 慢查询
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';

-- 表大小
SELECT pg_size_pretty(pg_total_relation_size('users'));

-- 缓冲区命中率
SELECT sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) FROM pg_stat_database;
```

## 2. pg_stat_statements

```sql
CREATE EXTENSION pg_stat_statements;

-- 最慢查询
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC LIMIT 10;
```

## 3. pgBadger

```bash
pgBadger /var/log/postgresql/postgresql-*.log -o report.html
```
## 4. 更多监控场景

### 4.1 连接监控

```sql
-- 查看连接数详情
SELECT
    datname,
    usename,
    client_addr,
    state,
    count(*) AS conn_count
FROM pg_stat_activity
GROUP BY datname, usename, client_addr, state
ORDER BY conn_count DESC;

-- 查看空闲连接
SELECT pid, usename, client_addr, state, state_change,
    now() - state_change AS idle_duration
FROM pg_stat_activity
WHERE state = 'idle'
ORDER BY idle_duration DESC;

-- 终止空闲超过 10 分钟的连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
    AND now() - state_change > interval '10 minutes';

-- 查看等待事件
SELECT pid, wait_event_type, wait_event, query
FROM pg_stat_activity
WHERE wait_event IS NOT NULL AND state = 'active';
```

### 4.2 表与索引监控

```sql
-- 表膨胀监控
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    n_live_tup,
    n_dead_tup,
    ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- 未使用的索引（浪费空间和写入性能）
SELECT
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 索引使用率
SELECT
    schemaname,
    relname,
    indexrelname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 4.3 锁监控

```sql
-- 当前锁等待
SELECT
    blocked.pid AS blocked_pid,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.query AS blocking_query,
    now() - blocked.query_start AS wait_duration
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
JOIN pg_locks kl ON kl.locktype = bl.locktype
    AND kl.database IS NOT DISTINCT FROM bl.database
    AND kl.relation IS NOT DISTINCT FROM bl.relation
    AND kl.pid != bl.pid AND kl.granted
JOIN pg_stat_activity blocking ON blocking.pid = kl.pid;

-- 查看长事务
SELECT pid, usename, query, now() - xact_start AS xact_duration
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_duration DESC;
```

### 4.4 复制监控

```sql
-- 主库：复制状态
SELECT
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes
FROM pg_stat_replication;

-- 从库：WAL 接收状态
SELECT status, received_lsn, latest_end_lsn
FROM pg_stat_wal_receiver;
```

### 4.5 Grafana + Prometheus 监控

```yaml
# postgres_exporter 配置
docker run -d --name postgres_exporter \
  -e DATA_SOURCE_NAME="postgresql://postgres:secret@localhost:5432/postgres?sslmode=disable" \
  prometheuscommunity/postgres-exporter
```

关键监控指标：
- `pg_up`：数据库是否在线
- `pg_stat_activity_count`：连接数
- `pg_stat_database_xact_commit`：事务提交数
- `pg_stat_user_tables_n_dead_tup`：Dead Tuple 数
- `pg_replication_lag`：复制延迟

### 4.6 告警规则

```yaml
# Prometheus 告警规则
groups:
  - name: postgresql
    rules:
      - alert: PostgreSQLDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical

      - alert: PostgreSQLHighConnections
        expr: pg_stat_activity_count > 180
        for: 5m
        labels:
          severity: warning

      - alert: PostgreSQLDeadTuples
        expr: pg_stat_user_tables_n_dead_tup > 100000
        for: 10m
        labels:
          severity: warning

      - alert: PostgreSQLReplicationLag
        expr: pg_replication_lag > 30
        for: 2m
        labels:
          severity: critical
```
