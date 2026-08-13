# 事务与 MVCC

## 1. ACID

| 特性 | 说明 |
|------|------|
| Atomicity | 原子性，Undo Log 保证 |
| Consistency | 一致性，应用层保证 |
| Isolation | 隔离性，MVCC + 锁保证 |
| Durability | 持久性，Redo Log 保证 |

## 2. 隔离级别

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---------|------|-----------|------|
| READ UNCOMMITTED | ✓ | ✓ | ✓ |
| READ COMMITTED | ✗ | ✓ | ✓ |
| REPEATABLE READ | ✗ | ✗ | ✗(InnoDB) |
| SERIALIZABLE | ✗ | ✗ | ✗ |

## 3. MVCC

```sql
-- 可重复读：事务第一次 SELECT 创建 Read View，后续复用
-- 读已提交：每次 SELECT 创建新的 Read View
```

## 4. 当前读 vs 快照读

```sql
-- 快照读（MVCC）
SELECT * FROM users WHERE id = 1;

-- 当前读（加锁）
SELECT * FROM users WHERE id = 1 FOR UPDATE;
SELECT * FROM users WHERE id = 1 LOCK IN SHARE MODE;
INSERT/UPDATE/DELETE
```

---
*待补充：更多事务细节*
