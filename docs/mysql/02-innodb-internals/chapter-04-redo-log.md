# Redo Log

## 1. WAL 原理

Write-Ahead Logging：数据修改前先写 Redo Log，保证崩溃恢复。

## 2. Redo Log 结构

```
ib_logfile0  ←──┐
ib_logfile1     │  循环写入
ib_logfile2  ───┘
```

## 3. 刷盘策略

```ini
innodb_flush_log_at_trx_commit = 1
-- 0: 每秒刷盘（可能丢 1s 数据）
-- 1: 每次提交刷盘（最安全，默认）
-- 2: 每次提交写 OS 缓存，每秒刷盘
```

## 4. Checkpoint

```
             checkpoint
                ↓
ib_logfile0: [已刷盘][未刷盘][空闲]
ib_logfile1: [未刷盘][空闲]
```

## 5. 崩溃恢复

1. 从 checkpoint 开始扫描 Redo Log
2. 重放所有未刷盘的修改
3. 通过 Undo Log 回滚未提交事务

## 6. Redo Log 物理结构

```sql
-- MySQL 8.0.30+ 动态调整 Redo Log 大小
ALTER INSTANCE ROTATE INNODB MASTER KEY;

-- 查看 Redo Log 配置
SHOW VARIABLES LIKE 'innodb_redo_log_capacity';  -- MySQL 8.0.30+
SHOW VARIABLES LIKE 'innodb_log_file_size';       -- MySQL 8.0.30 之前
SHOW VARIABLES LIKE 'innodb_log_files_in_group';  -- MySQL 8.0.30 之前

-- MySQL 8.0.30+ Redo Log 存储在 #innodb_redo 目录
-- MySQL 8.0.30 之前存储在 ib_logfile0, ib_logfile1 等文件
```

**Redo Log 记录格式：**
```
┌──────────────┐
│ Type         │  日志类型（MLOG_XXX）
├──────────────┤
│ Space ID     │  表空间 ID
├──────────────┤
│ Page Number  │  页号
├──────────────┤
│ Offset       │  页内偏移
├──────────────┤
│ Data         │  修改的数据
└──────────────┘
```

## 7. Mini-Transaction (MTR)

MTR 是 InnoDB 对 Redo Log 的最小原子操作单位。

```sql
-- 一个 MTR 包含多个 Redo Log 记录
-- 例如：插入一条记录的 MTR
-- 1. 修改数据页（插入记录）
-- 2. 修改 Page Header（更新记录数）
-- 3. 修改系统页（更新 MAX_TRX_ID）
-- 这些日志记录组成一个 MTR，要么全部写入，要么全部不写入
```

## 8. Log Buffer

```sql
-- Log Buffer 相关参数
SHOW VARIABLES LIKE 'innodb_log_buffer_size';  -- 默认 16MB

-- Log Buffer 刷盘时机：
-- 1. 事务提交时（innodb_flush_log_at_trx_commit 控制）
-- 2. Log Buffer 空间不足时（超过一半）
-- 3. 后台线程每秒刷新
-- 4. Checkpoint 时
```

## 9. Redo Log 与 Binlog 的区别

| 特性 | Redo Log | Binlog |
|------|----------|--------|
| 所属层 | InnoDB 存储引擎层 | MySQL Server 层 |
| 内容 | 物理日志（页修改） | 逻辑日志（SQL/行变更） |
| 写入方式 | 循环写，固定大小 | 追加写，文件轮转 |
| 用途 | 崩溃恢复 | 主从复制、数据恢复 |
| 事务标记 | 无事务边界 | 有明确的 BEGIN/COMMIT |

## 10. 两阶段提交详解

```
事务执行过程：
1. InnoDB: 写 Redo Log (prepare 状态)
2. Server: 写 Binlog
3. InnoDB: 写 Redo Log (commit 状态)

崩溃恢复：
- 检查 Redo Log 中 prepare 状态的事务
- 如果对应的 Binlog 存在且完整 → 提交事务
- 如果对应的 Binlog 不存在 → 回滚事务
```

## 11. 最佳实践

1. **双1配置保证数据安全** — `innodb_flush_log_at_trx_commit=1` + `sync_binlog=1`
2. **Redo Log 大小设置** — 写入密集型业务建议 2G-4G
3. **SSD 环境** — Redo Log 和数据文件放在同一 SSD 即可
4. **监控 Redo Log 写入量** — `SHOW GLOBAL STATUS LIKE 'Innodb_os_log_written';`
5. **避免长事务** — 长事务会阻止 Checkpoint，导致 Redo Log 空间紧张

---
