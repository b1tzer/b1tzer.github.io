# VACUUM 机制

## 1. 为什么需要 VACUUM

- 清理死元组（被 DELETE 或 UPDATE 产生的旧版本）
- 回收空间供复用
- 防止事务ID回卷（XID Wraparound）

## 2. VACUUM 类型

```sql
-- 标准 VACUUM（不锁表）
VACUUM users;

-- VACUUM FULL（锁表，重写表）
VACUUM FULL users;

-- 分析统计信息
ANALYZE users;
```

## 3. Autovacuum 配置

```conf
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.2
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.1
```

## 4. 事务ID回卷

```sql
-- 查看事务ID年龄
SELECT datname, age(datfrozenxid) FROM pg_database;

-- 手动冻结
VACUUM FREEZE users;
```

---
## 5. VACUUM 调优详解

### 5.1 Autovacuum 参数调优

```conf
# 全局 autovacuum 配置
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min

# VACUUM 触发条件：dead_tuples > threshold + scale_factor * total_tuples
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.2

# ANALYZE 触发条件：changed_tuples > threshold + scale_factor * total_tuples
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.1

# VACUUM 执行代价延迟（防止 IO 过载）
autovacuum_vacuum_cost_delay = 2ms
autovacuum_vacuum_cost_limit = -1  # -1 使用 vacuum_cost_limit 的值
vacuum_cost_limit = 200
vacuum_cost_page_hit = 1
vacuum_cost_page_miss = 10
vacuum_cost_page_dirty = 20
```

### 5.2 针对特定表的调优

```sql
-- 高频更新的大表：降低触发阈值
ALTER TABLE hot_table SET (
    autovacuum_vacuum_scale_factor = 0.01,  -- 1% 行变化就触发
    autovacuum_vacuum_threshold = 100,
    autovacuum_analyze_scale_factor = 0.01,
    autovacuum_vacuum_cost_delay = 0  -- 不限速，尽快清理
);

-- 只读表：禁用 autovacuum（节省资源）
ALTER TABLE static_data SET (
    autovacuum_enabled = false
);

-- 查看表级别的 autovacuum 参数
SELECT reloptions FROM pg_class WHERE relname = 'hot_table';
```

### 5.3 监控 VACUUM 进度

```sql
-- 查看正在执行的 VACUUM（PG 12+）
SELECT
    pid,
    phase,
    heap_blks_total,
    heap_blks_scanned,
    heap_blks_vacuumed,
    index_vacuum_count,
    max_dead_tuples,
    num_dead_tuples
FROM pg_stat_progress_vacuum;

-- 查看 autovacuum 工作进程
SELECT pid, query, wait_event_type, state
FROM pg_stat_activity
WHERE backend_type = 'autovacuum worker';
```

### 5.4 VACUUM 与 IO 控制

```conf
# VACUUM 代价延迟（控制 VACUUM 的 IO 速度，避免影响业务）
vacuum_cost_delay = 2ms          # 每超过 cost_limit 后暂停的时间
vacuum_cost_limit = 200          # 累积代价达到此值后暂停
```

> **调优原则**：如果 VACUUM 清理速度跟不上 Dead Tuple 产生速度，降低 `vacuum_cost_delay` 或提高 `vacuum_cost_limit`，让 VACUUM 更积极地工作。如果 VACUUM 影响业务 IO，增加延迟或降低限制。

### 5.5 事务 ID 回卷防护

```sql
-- 查看事务 ID 年龄（正常应 < 2 亿，告警阈值 5 亿）
SELECT
    datname,
    age(datfrozenxid) AS xid_age,
    2^31 - age(datfrozenxid) AS remaining
FROM pg_database
ORDER BY xid_age DESC;

-- 查看表的事务 ID 年龄
SELECT
    relname,
    age(relfrozenxid) AS xid_age
FROM pg_class
WHERE relkind = 'r'
ORDER BY xid_age DESC
LIMIT 20;

-- 手动执行 FREEZE（当年龄过大时）
VACUUM FREEZE large_table;
```

> **重要**：当事务 ID 年龄接近 2^31（约 21 亿）时，PG 会强制关闭数据库以防止事务 ID 回卷。确保 autovacuum 正常工作，`autovacuum_freeze_max_age` 默认为 2 亿，触发强制 VACUUM FREEZE。
