# 监控

## 1. Performance Schema

```sql
-- 查看连接
SELECT * FROM performance_schema.threads WHERE PROCESSLIST_ID = <pid>;

-- 查看锁等待
SELECT * FROM performance_schema.data_lock_waits;

-- 查看语句统计
SELECT * FROM performance_schema.events_statements_summary_by_digest
ORDER BY sum_timer_wait DESC LIMIT 10;
```

## 2. sys Schema

```sql
-- 最慢查询
SELECT * FROM sys.statements_with_runtimes_in_95th_percentile LIMIT 10;

-- 未使用的索引
SELECT * FROM sys.schema_unused_indexes;

-- 冗余索引
SELECT * FROM sys.schema_redundant_indexes;
```

## 3. 慢查询日志

```ini
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_log_time = 1
```

```bash
# 分析慢查询
mysqldumpslow -s t -t 10 /var/log/mysql/slow.log
```

---
*待补充：更多监控场景*
