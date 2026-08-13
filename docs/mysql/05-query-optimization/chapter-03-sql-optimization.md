# SQL 优化技巧

## 1. 避免 SELECT *

```sql
-- 差
SELECT * FROM users WHERE id = 1;
-- 好
SELECT id, name, email FROM users WHERE id = 1;
```

## 2. 避免索引失效

```sql
-- 差：函数操作
WHERE YEAR(created_at) = 2024
-- 好
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'

-- 差：隐式类型转换
WHERE phone = 13800138000
-- 好
WHERE phone = '13800138000'
```

## 3. 分页优化

```sql
-- 慢：OFFSET 大
SELECT * FROM users ORDER BY id LIMIT 1000000, 10;
-- 快：游标分页
SELECT * FROM users WHERE id > 1000000 ORDER BY id LIMIT 10;
```

## 4. 批量操作

```sql
-- 慢
INSERT INTO users (name) VALUES ('a');
INSERT INTO users (name) VALUES ('b');
-- 快
INSERT INTO users (name) VALUES ('a'), ('b'), ('c');
```

---
*待补充：更多优化场景*
