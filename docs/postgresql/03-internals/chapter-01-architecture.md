# 进程架构

## 1. 多进程模型

PostgreSQL 采用多进程架构，主要进程：

| 进程 | 说明 |
|------|------|
| Postmaster | 主进程，监听连接，fork Backend |
| Backend | 每个客户端连接一个 |
| Background Writer | 将脏页写入磁盘 |
| WAL Writer | 将 WAL 缓冲写入磁盘 |
| Checkpointer | 执行检查点 |
| Autovacuum | 自动清理死元组 |
| Stats Collector | 收集统计信息 |

## 2. 连接流程

```
Client → Postmaster → fork → Backend → 处理查询 → 返回结果
```

## 3. 进程间通信

- 共享内存（Shared Buffer、WAL Buffer）
- 信号量（Semaphore）
- 消息队列

---
## 4. 各进程详解

### 4.1 Postmaster 主进程

Postmaster 是 PostgreSQL 的主进程，负责：
- 监听客户端连接请求（默认端口 5432）
- 为每个客户端连接 fork 一个 Backend 进程
- 启动和管理所有后台进程（BgWriter、WAL Writer、Checkpointer、Autovacuum 等）
- 处理数据库启动和关闭

```bash
# 查看 Postmaster 进程
ps aux | grep postgres
# postgres  1234  ... /usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main
```

### 4.2 Backend 后台进程

每个客户端连接对应一个 Backend 进程，负责执行该连接上的所有 SQL 查询。

```sql
-- 查看所有 Backend 进程
SELECT pid, usename, datname, client_addr, state, query
FROM pg_stat_activity
WHERE backend_type = 'client backend';

-- 查看连接数
SELECT count(*) FROM pg_stat_activity;

-- 终止特定连接
SELECT pg_terminate_backend(pid);
```

> **为什么 PG 不用线程而用进程**：进程隔离性更好，一个 Backend 崩溃不会影响其他连接。代价是进程创建和上下文切换的开销比线程大，所以需要连接池（PgBouncer）来复用连接。

### 4.3 Background Writer

负责将 Shared Buffer 中的脏页（被修改但未写入磁盘的数据页）写入磁盘，减少检查点时的 IO 峰值。

```ini
# BgWriter 配置
bgwriter_delay = 200ms          # 每次写入间隔
bgwriter_lru_maxpages = 100     # 每次最多写入的页数
bgwriter_lru_multiplier = 2.0   # 基于最近需求预测写入量
```

### 4.4 WAL Writer

将 WAL 缓冲区中的 WAL 记录写入磁盘，保证事务的持久性。WAL Writer 是崩溃恢复的基础。

```ini
wal_writer_delay = 200ms        # WAL Writer 刷盘间隔
wal_writer_flush_after = 1MB    # 累积多少 WAL 后强制刷盘
```

### 4.5 Checkpointer

执行检查点（Checkpoint），将所有脏页刷入磁盘，确保数据一致性。崩溃恢复时只需从最后一个检查点开始重放 WAL。

```ini
checkpoint_timeout = 5min       # 检查点间隔
checkpoint_completion_target = 0.9  # 检查点完成目标（0.9 表示尽量平滑写入）
checkpoint_warning = 30s        # 检查点间隔过短时发出警告
```

### 4.6 Autovacuum Launcher

自动触发 VACUUM 和 ANALYZE，清理 Dead Tuple 并更新统计信息。

```ini
autovacuum = on
autovacuum_max_workers = 3       # 最大并行 autovacuum 工作进程数
autovacuum_naptime = 1min        # 每次检查间隔
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.2
```

### 4.7 Stats Collector

收集数据库的统计信息（表大小、行数、索引使用率等），供优化器和监控视图使用。

```sql
-- 查看统计信息收集器的状态
SELECT * FROM pg_stat_bgwriter;

-- 查看表的统计信息
SELECT schemaname, relname, n_live_tup, n_dead_tup, last_analyze
FROM pg_stat_user_tables;
```

## 5. 进程间通信机制

| 机制 | 用途 | 说明 |
|------|------|------|
| 共享内存（Shared Memory） | 数据页缓存、WAL 缓冲、锁表 | 所有进程共享，通过 Buffer Manager 管理 |
| 信号量（Semaphore） | 进程同步、锁等待通知 | 用于轻量级的进程间同步 |
| 消息队列（Message Queue） | 异步通知 | 如 LISTEN/NOTIFY 机制 |

## 6. 查看系统进程状态

```sql
-- 查看所有 PG 后台进程
SELECT pid, backend_type, pg_size_pretty(backend_type) AS type
FROM pg_stat_activity;

-- 查看各类型进程数量
SELECT backend_type, count(*)
FROM pg_stat_activity
GROUP BY backend_type;

-- 查看共享内存使用
SELECT * FROM pg_shmem_allocations;

-- 查看系统资源（PG 16+）
SELECT * FROM pg_stat_io;
```
