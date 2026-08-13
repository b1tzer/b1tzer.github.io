# 咨询锁

## 1. 用法

```sql
-- 获取锁（会话级）
SELECT pg_advisory_lock(12345);
-- 释放
SELECT pg_advisory_unlock(12345);

-- 获取锁（事务级）
SELECT pg_advisory_xact_lock(12345);

-- 尝试获取（不阻塞）
SELECT pg_try_advisory_lock(12345);  -- 返回 boolean
```

## 2. 应用场景

- 分布式锁
- 防止并发任务执行
- 限流

---
*待补充：更多咨询锁场景*
