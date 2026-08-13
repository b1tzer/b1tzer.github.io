# PostgreSQL 技术体系

系统化的 PostgreSQL 知识体系，从基础入门到内核原理，从 SQL 进阶到高可用架构。

## 目录结构

### 01-基础入门
- [PG 概览](01-basics/chapter-01-overview) — 发展历史、优势、与 MySQL 对比
- [安装部署](01-basics/chapter-02-install-config) — 安装方式、核心配置、目录结构
- [SQL 基础](01-basics/chapter-03-sql-basics) — DDL/DML/DCL
- [数据类型](01-basics/chapter-04-data-types) — 数值/字符串/日期/数组/JSONB
- [PG vs MySQL](01-basics/chapter-05-pg-vs-mysql) — 全面对比

### 02-SQL进阶
- [窗口函数](02-sql-advanced/chapter-01-window-function) — ROW_NUMBER/RANK/LAG/LEAD
- [CTE 与递归](02-sql-advanced/chapter-02-cte-recursive) — WITH 递归查询
- [子查询与 LATERAL](02-sql-advanced/chapter-03-subquery-lateral) — 高级查询技巧
- [JSONB](02-sql-advanced/chapter-04-jsonb) — JSONB 操作、索引、查询
- [全文搜索](02-sql-advanced/chapter-05-full-text-search) — tsvector/tsquery、中文分词

### 03-内核原理
- [进程架构](03-internals/chapter-01-architecture) — Postmaster/Backend/BgWriter
- [内存架构](03-internals/chapter-02-memory) — Shared Buffer/WAL Buffer
- [存储架构](03-internals/chapter-03-storage) — 表空间/页面结构/元组
- [MVCC](03-internals/chapter-04-mvcc) — 多版本并发控制、可见性规则
- [VACUUM](03-internals/chapter-05-vacuum) — 清理机制、autovacuum、事务ID回卷
- [WAL](03-internals/chapter-06-wal) — 预写日志、检查点、恢复
- [查询处理](03-internals/chapter-07-query-processing) — Parser→Planner→Executor

### 04-索引与查询优化
- [索引类型](04-index-optimization/chapter-01-index-types) — B-tree/Hash/GIN/GiST/BRIN
- [索引设计](04-index-optimization/chapter-02-index-design) — 部分索引、表达式索引、覆盖索引
- [EXPLAIN](04-index-optimization/chapter-03-explain-analyze) — 查询计划解读
- [查询优化](04-index-optimization/chapter-04-query-optimization) — 优化技巧、统计信息
- [表分区](04-index-optimization/chapter-05-partitioning) — 范围/列表/哈希分区

### 05-事务与并发
- [事务](05-transaction-concurrency/chapter-01-transaction) — 隔离级别、保存点
- [锁机制](05-transaction-concurrency/chapter-02-lock) — 表锁/行锁/死锁检测
- [咨询锁](05-transaction-concurrency/chapter-03-advisory-lock) — 应用场景
- [并发实践](05-transaction-concurrency/chapter-04-concurrency) — 热点行、乐观锁

### 06-高级特性
- [扩展机制](06-advanced-features/chapter-01-extensions) — CREATE EXTENSION
- [PL/pgSQL](06-advanced-features/chapter-02-plpgsql) — 存储过程、触发器
- [FDW](06-advanced-features/chapter-03-foreign-data-wrapper) — 外部数据包装器
- [逻辑复制](06-advanced-features/chapter-04-logical-replication) — 发布/订阅
- [PostGIS](06-advanced-features/chapter-05-postgis) — 空间数据
- [LISTEN/NOTIFY](06-advanced-features/chapter-06-notify) — 异步通知
- [物化视图](06-advanced-features/chapter-07-materialized-view) — 物化视图

### 07-运维管理
- [备份恢复](07-operations/chapter-01-backup-restore) — pg_dump/PITR
- [监控](07-operations/chapter-02-monitoring) — pg_stat/pgBadger
- [安全](07-operations/chapter-03-security) — 认证/权限/行级安全/SSL
- [用户管理](07-operations/chapter-04-user-management) — 角色、权限体系
- [日常维护](07-operations/chapter-05-maintenance) — VACUUM/ANALYZE/REINDEX

### 08-高可用与架构
- [流复制](08-ha-architecture/chapter-01-streaming-replication) — 主从配置
- [高可用方案](08-ha-architecture/chapter-02-ha-solutions) — Patroni/repmgr
- [连接池](08-ha-architecture/chapter-03-connection-pooling) — PgBouncer/Pgpool-II
- [分片](08-ha-architecture/chapter-04-sharding) — Citus/应用层分片
- [迁移](08-ha-architecture/chapter-05-migration) — 版本升级/数据迁移

### 09-实战场景
- [Spring 集成](09-practice/chapter-01-spring-integration) — JPA/MyBatis 适配
- [性能调优](09-practice/chapter-02-performance-tuning) — 参数优化
- [常见模式](09-practice/chapter-03-common-patterns) — 审计日志/时序数据/多租户
