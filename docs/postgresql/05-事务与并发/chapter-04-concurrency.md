# 并发控制实践

## 1. 热点行处理

```sql
-- 使用 SELECT FOR UPDATE
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

## 2. 乐观锁

```sql
-- 使用版本号
UPDATE products 
SET stock = stock - 1, version = version + 1 
WHERE id = 1 AND version = 5;

-- 检查影响行数，0 表示冲突
```

## 3. 批量更新

```sql
-- 使用 CTE 批量更新
WITH batch AS (
    SELECT id FROM orders WHERE status = 'pending' LIMIT 1000
)
UPDATE orders SET status = 'processing' 
WHERE id IN (SELECT id FROM batch);
```

---
*待补充：更多并发场景*
