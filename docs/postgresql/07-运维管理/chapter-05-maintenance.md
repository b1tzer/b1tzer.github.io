# 日常维护

## 1. VACUUM

```sql
-- 常规清理
VACUUM users;
-- 完全清理（锁表）
VACUUM FULL users;
-- 分析统计
ANALYZE users;
```

## 2. REINDEX

```sql
REINDEX TABLE users;
REINDEX INDEX idx_users_email;
```

## 3. 清理日志

```bash
# 清理 WAL 归档
find /archive -name '*.backup' -mtime +7 -delete
```

## 4. 常用维护脚本

```sql
-- 查看膨胀率
SELECT 
    schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

---
*待补充：更多维护场景*
