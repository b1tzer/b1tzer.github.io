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

---
*待补充：更多 Redo Log 细节*
