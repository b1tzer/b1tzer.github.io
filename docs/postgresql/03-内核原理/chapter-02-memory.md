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
*待补充：更多内存管理细节*
