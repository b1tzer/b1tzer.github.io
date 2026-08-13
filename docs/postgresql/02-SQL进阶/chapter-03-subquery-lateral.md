# 子查询与 LATERAL JOIN

## 1. 子查询

```sql
-- 标量子查询
SELECT name, (SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id) AS order_count
FROM users;

-- EXISTS
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- IN
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders WHERE amount > 1000);
```

## 2. LATERAL JOIN

```sql
-- 每个用户的最近3笔订单
SELECT u.name, o.*
FROM users u
CROSS JOIN LATERAL (
    SELECT * FROM orders 
    WHERE user_id = u.id 
    ORDER BY created_at DESC 
    LIMIT 3
) o;
```

## 3. 派生表

```sql
SELECT dept, avg_salary
FROM (
    SELECT department AS dept, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department
) t
WHERE avg_salary > 10000;
```

---
*待补充：更多查询技巧*
