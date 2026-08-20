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
## 5. 更多维护场景

### 5.1 定期维护脚本

```sql
-- 每日维护任务
-- 1. 更新统计信息
ANALYZE;

-- 2. 清理膨胀严重的表
SELECT schemaname, tablename,
    ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
    AND ROUND(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2) > 10
ORDER BY dead_pct DESC;

-- 对膨胀率 > 10% 的表执行 VACUUM
-- VACUUM table_name;

-- 3. 检查无效索引
SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 4. 检查表空间使用
SELECT
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
ORDER BY pg_database_size(datname) DESC;
```

### 5.2 清理旧数据

```sql
-- 删除过期数据（分批删除，避免长事务）
DO $$
DECLARE
    batch_size INT := 1000;
    deleted INT;
BEGIN
    LOOP
        DELETE FROM audit_logs
        WHERE id IN (
            SELECT id FROM audit_logs
            WHERE created_at < NOW() - INTERVAL '1 year'
            LIMIT batch_size
        );
        GET DIAGNOSTICS deleted = ROW_COUNT;
        EXIT WHEN deleted = 0;
        PERFORM pg_sleep(0.1);  -- 暂停 100ms，减轻 IO 压力
        RAISE NOTICE 'Deleted % rows', deleted;
    END LOOP;
END $$;

-- 使用分区表快速删除（最佳方案）
ALTER TABLE orders DETACH PARTITION orders_2023;
DROP TABLE orders_2023;  -- 瞬间完成
```

### 5.3 清理 WAL 和归档

```bash
# 清理过期的 WAL 归档（保留最近 7 天）
find /archive -name '*.backup' -mtime +7 -delete
find /archive -name '0000*' -mtime +7 -delete

# 使用 pg_archivecleanup
pg_archivecleanup /archive 000000010000000000000010
```

### 5.4 数据库迁移检查

```sql
-- 检查数据库兼容性
SELECT * FROM pg_extension;
SELECT * FROM pg_proc WHERE pronamespace = 'public'::regnamespace;

-- 检查自定义类型
SELECT * FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'c';

-- 检查外键依赖
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

### 5.5 性能维护

```sql
-- 重建膨胀的索引
REINDEX INDEX CONCURRENTLY idx_users_email;

-- 重建整个表的索引
REINDEX TABLE CONCURRENTLY users;

-- 更新所有表的统计信息
ANALYZE VERBOSE;

-- 检查表的最后统计更新时间
SELECT
    relname,
    last_analyze,
    last_autoanalyze,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY last_analyze DESC NULLS LAST;
```

### 5.6 维护检查清单

| 频率 | 任务 | SQL/命令 |
|------|------|----------|
| 每日 | 检查慢查询 | `pg_stat_statements` |
| 每日 | 检查连接数 | `pg_stat_activity` |
| 每日 | 检查复制延迟 | `pg_stat_replication` |
| 每周 | 检查表膨胀 | `pg_stat_user_tables` |
| 每周 | 检查未使用索引 | `pg_stat_user_indexes` |
| 每周 | 检查磁盘空间 | `pg_database_size` |
| 每月 | 更新统计信息 | `ANALYZE` |
| 每月 | 检查备份完整性 | `pg_restore -l` |
| 每季度 | 检查安全配置 | `pg_hba.conf` 审计 |
