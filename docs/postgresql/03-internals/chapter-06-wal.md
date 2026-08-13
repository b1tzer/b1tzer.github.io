# WAL 预写日志

## 1. WAL 原理

Write-Ahead Logging：数据修改前先写 WAL 日志，保证崩溃恢复。

## 2. WAL 配置

```conf
wal_level = replica              # replica | logical
max_wal_size = 1GB
min_wal_size = 80MB
wal_compression = on
```

## 3. 检查点

```conf
checkpoint_timeout = 5min
checkpoint_completion_target = 0.9
```

## 4. WAL 文件管理

```sql
-- 查看 WAL 位置
SELECT pg_current_wal_lsn();

-- 切换 WAL
SELECT pg_switch_wal();
```

---
*待补充：更多 WAL 细节*
