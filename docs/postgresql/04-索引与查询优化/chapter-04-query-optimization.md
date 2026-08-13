# 查询优化技巧

## 1. 避免 SELECT *

```sql
-- 差
SELECT * FROM users WHERE id = 1;
-- 好
SELECT id, name, email FROM users WHERE id = 1;
```

## 2. 使用 EXISTS 替代 IN

```sql
-- 慢
SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);
-- 快
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

## 3. 避免函数调用

```sql
-- 差：无法使用索引
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';
-- 好：使用表达式索引
CREATE INDEX idx_lower_email ON users(LOWER(email));
```

## 4. 统计信息

```sql
-- 查看统计信息
SELECT * FROM pg_stats WHERE tablename = 'users';

-- 手动分析
ANALYZE users;
```

---
*待补充：更多优化场景*
