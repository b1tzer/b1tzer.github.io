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
*待补充：更多锁场景*
