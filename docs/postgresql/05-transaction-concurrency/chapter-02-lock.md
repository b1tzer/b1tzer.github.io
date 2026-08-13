# 锁机制

## 1. 表锁

| 锁模式 | 说明 | 冲突 |
|--------|------|------|
| ACCESS SHARE | SELECT | 排他锁 |
| ROW SHARE | SELECT FOR UPDATE | 排他锁以上 |
| ROW EXCLUSIVE | INSERT/UPDATE/DELETE | SHARE以上 |
| SHARE UPDATE EXCLUSIVE | VACUUM | 同级冲突 |
| SHARE | CREATE INDEX | EXCLUSIVE以上 |
| SHARE ROW EXCLUSIVE | | 排他锁以上 |
| EXCLUSIVE | | ACCESS SHARE以上 |
| ACCESS EXCLUSIVE | ALTER TABLE/DROP | 所有冲突 |

## 2. 行锁

```sql
-- SELECT FOR UPDATE
BEGIN;
SELECT * FROM users WHERE id = 1 FOR UPDATE;  -- 锁定行
UPDATE users SET balance = balance - 100 WHERE id = 1;
COMMIT;

-- FOR NO KEY UPDATE
SELECT * FROM users WHERE id = 1 FOR NO KEY UPDATE;

-- FOR SHARE
SELECT * FROM users WHERE id = 1 FOR SHARE;
```

## 3. 死锁检测

```sql
-- 查看锁等待
SELECT * FROM pg_locks WHERE NOT granted;

-- 杀死阻塞进程
SELECT pg_terminate_backend(pid) FROM pg_locks WHERE NOT granted;
```

---
## 4. 更多锁场景与最佳实践

### 4.1 锁等待分析

```sql
-- 查看所有锁等待关系
SELECT
    blocked.pid AS blocked_pid,
    blocked.usename AS blocked_user,
    blocked.query AS blocked_query,
    blocking.pid AS blocking_pid,
    blocking.usename AS blocking_user,
    blocking.query AS blocking_query,
    now() - blocked.query_start AS wait_duration
FROM pg_stat_activity blocked
JOIN pg_locks bl ON bl.pid = blocked.pid AND NOT bl.granted
JOIN pg_locks kl ON kl.locktype = bl.locktype
    AND kl.database IS NOT DISTINCT FROM bl.database
    AND kl.relation IS NOT DISTINCT FROM bl.relation
    AND kl.pid != bl.pid AND kl.granted
JOIN pg_stat_activity blocking ON blocking.pid = kl.pid
ORDER BY wait_duration DESC;

-- 查看持锁时间最长的查询
SELECT
    pid,
    usename,
    query,
    now() - query_start AS duration,
    state
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;
```

### 4.2 锁超时设置

```sql
-- 设置锁等待超时（避免长时间等待）
SET lock_timeout = '5s';

-- 如果获取不到锁，5 秒后报错
ALTER TABLE users ADD COLUMN nickname VARCHAR(50);
-- ERROR: canceling statement due to lock timeout

-- 在事务中设置
BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE users ADD COLUMN nickname VARCHAR(50);
COMMIT;
```

### 4.3 避免锁升级

```sql
-- ❌ 错误：先查询再更新可能导致锁升级
SELECT * FROM users WHERE id = 1;  -- 获取 ACCESS SHARE 锁
-- 另一个事务可能在此时获取 ACCESS EXCLUSIVE 锁（ALTER TABLE）
UPDATE users SET name = 'new' WHERE id = 1;  -- 需要 ROW EXCLUSIVE 锁

-- ✅ 正确：使用 SELECT FOR UPDATE 获取行锁
BEGIN;
SELECT * FROM users WHERE id = 1 FOR UPDATE;
UPDATE users SET name = 'new' WHERE id = 1;
COMMIT;
```

### 4.4 DDL 锁策略

```sql
-- 某些 DDL 操作支持 NOWAIT
ALTER TABLE users ADD COLUMN nickname VARCHAR(50);
-- 默认会等待锁

-- 使用 lock_timeout 控制等待时间
SET lock_timeout = '3s';
ALTER TABLE users ADD COLUMN nickname VARCHAR(50);
-- 超过 3 秒获取不到锁就报错

-- 查看哪些 DDL 操作会获取 ACCESS EXCLUSIVE 锁
-- ALTER TABLE（大多数操作）
-- DROP TABLE
-- TRUNCATE
-- VACUUM FULL
-- REINDEX
```

### 4.5 行锁冲突矩阵

```
                 请求的锁
已持有的锁  | FOR UPDATE | FOR NO KEY UPDATE | FOR SHARE | FOR KEY SHARE
FOR UPDATE         | 冲突     | 冲突              | 冲突      | 冲突
FOR NO KEY UPDATE  | 冲突     | 冲突              | 冲突      | 不冲突
FOR SHARE          | 冲突     | 冲突              | 不冲突    | 不冲突
FOR KEY SHARE      | 冲突     | 不冲突            | 不冲突    | 不冲突
```

> **实战技巧**：外键检查使用 `FOR KEY SHARE`，是最弱的行锁。当两个表有外键关系时，更新被引用表使用 `FOR NO KEY UPDATE`，不会与外键检查的 `FOR KEY SHARE` 冲突，大幅减少锁等待。
