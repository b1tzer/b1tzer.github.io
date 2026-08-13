# 死锁

## 1. 什么是死锁

两个或多个事务相互等待对方释放锁。

## 2. 死锁案例

```sql
-- 事务 A
BEGIN;
UPDATE users SET name = 'A' WHERE id = 1;  -- 锁 id=1
UPDATE users SET name = 'A' WHERE id = 2;  -- 等待 id=2

-- 事务 B
BEGIN;
UPDATE users SET name = 'B' WHERE id = 2;  -- 锁 id=2
UPDATE users SET name = 'B' WHERE id = 1;  -- 等待 id=1 → 死锁！
```

## 3. 死锁检测

```ini
innodb_deadlock_detect = ON           # 开启死锁检测
innodb_lock_wait_timeout = 50         # 锁等待超时(秒)
```

## 4. 避免策略

1. 固定加锁顺序（如按主键顺序）
2. 缩小事务范围
3. 使用低隔离级别
4. 合理设计索引，减少锁范围

```sql
-- 查看最近的死锁
SHOW ENGINE INNODB STATUS;
```

---
*待补充：更多死锁案例*
