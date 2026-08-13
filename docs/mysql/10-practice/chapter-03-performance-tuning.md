# 性能调优实战

## 1. 参数优化

```ini
# Buffer Pool
innodb_buffer_pool_size = 4G          # 物理内存的 70%

# 日志
innodb_log_file_size = 1G
innodb_flush_log_at_trx_commit = 1

# 连接
max_connections = 500
thread_cache_size = 64

# 查询缓存 (8.0 移除)
# 临时表
tmp_table_size = 64M
max_heap_table_size = 64M
```

## 2. 慢查询分析

```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 1;

-- 分析
SELECT * FROM sys.statements_with_runtimes_in_95th_percentile LIMIT 10;
```

## 3. 索引优化

```sql
-- 查看索引使用情况
SELECT * FROM sys.schema_unused_indexes;
SELECT * FROM sys.schema_redundant_indexes;
```

## 4. 架构优化

- 读写分离
- 缓存（Redis）
- 分库分表
- 数据归档

---
*待补充：更多调优场景*
