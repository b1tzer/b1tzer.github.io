# 子查询优化

## 1. 子查询类型

```sql
-- 标量子查询
SELECT name, (SELECT COUNT(*) FROM orders WHERE user_id = u.id) FROM users u;

-- IN 子查询
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);

-- EXISTS 子查询
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

## 2. 优化策略

```sql
-- 慢：IN 子查询
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 1000);
-- 快：改用 JOIN
SELECT DISTINCT u.* FROM users u JOIN orders o ON u.id = o.user_id WHERE o.amount > 1000;

-- 慢：NOT IN
SELECT * FROM users WHERE id NOT IN (SELECT user_id FROM orders);
-- 快：LEFT JOIN
SELECT u.* FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE o.id IS NULL;
```

## 3. 半连接 (Semi-Join)

MySQL 8.0 自动将某些 IN 子查询转换为半连接。

---
*待补充：更多子查询优化场景*
