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

---
*待补充：更多监控场景*
