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
## 5. 更多优化场景

### 5.1 N+1 查询问题

```sql
-- ❌ N+1 查询：先查 N 个用户，再对每个用户查订单
-- 应用层代码（伪代码）：
-- users = SELECT * FROM users;
-- for user in users:
--     orders = SELECT * FROM orders WHERE user_id = user.id;  -- N 次查询

-- ✅ 解决方案1：JOIN 一次查出
SELECT u.*, o.*
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active';

-- ✅ 解决方案2：批量查询
SELECT * FROM orders WHERE user_id IN (1, 2, 3, 4, 5);

-- ✅ 解决方案3：LATERAL JOIN（每个用户取最近的订单）
SELECT u.name, o.*
FROM users u
CROSS JOIN LATERAL (
    SELECT * FROM orders WHERE user_id = u.id ORDER BY created_at DESC LIMIT 3
) o;
```

### 5.2 分页优化

```sql
-- ❌ 低效分页：OFFSET 越大越慢（需要扫描并跳过前面的数据）
SELECT * FROM orders ORDER BY id LIMIT 10 OFFSET 100000;

-- ✅ 高效分页：基于游标（Keyset Pagination）
SELECT * FROM orders WHERE id > 100000 ORDER BY id LIMIT 10;

-- ✅ 高效分页：复合排序
SELECT * FROM orders
WHERE (created_at, id) < ('2024-06-01', 5000)
ORDER BY created_at DESC, id DESC
LIMIT 10;

-- 创建支持分页的索引
CREATE INDEX idx_orders_pagination ON orders(created_at DESC, id DESC);
```

### 5.3 批量操作优化

```sql
-- ❌ 逐条更新（慢）
UPDATE users SET status = 'inactive' WHERE id = 1;
UPDATE users SET status = 'inactive' WHERE id = 2;
-- ... 重复 1000 次

-- ✅ 批量更新（快 10-100 倍）
UPDATE users SET status = 'inactive'
WHERE id IN (1, 2, 3, ..., 1000);

-- ✅ CTE 批量更新（更灵活）
WITH batch AS (
    SELECT id FROM users WHERE last_login < '2023-01-01' LIMIT 1000
)
UPDATE users SET status = 'inactive'
WHERE id IN (SELECT id FROM batch);

-- ✅ COPY 批量导入（最快）
COPY users (name, email, status) FROM '/tmp/users.csv' WITH CSV;
```

### 5.4 JOIN 优化

```sql
-- 查看 JOIN 策略
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM users u JOIN orders o ON u.id = o.user_id;

-- 驱动表选择：小表驱动大表
-- PG 优化器通常会自动选择最优的驱动表
-- 可以通过设置 join_collapse_limit 强制按 SQL 顺序执行
SET join_collapse_limit = 1;  -- 强制按 SQL 顺序 JOIN

-- 确保 JOIN 列有索引
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### 5.5 子查询优化

```sql
-- ❌ 相关子查询（每行执行一次）
SELECT u.name,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u;

-- ✅ 改写为 JOIN
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.name;

-- ✅ 使用 LATERAL 优化（需要 LIMIT 时）
SELECT u.name, o.latest_order
FROM users u
CROSS JOIN LATERAL (
    SELECT MAX(created_at) AS latest_order FROM orders WHERE user_id = u.id
) o;
```

### 5.6 避免隐式类型转换

```sql
-- ❌ 隐式类型转换导致索引失效
-- 如果 user_id 是 VARCHAR 类型
SELECT * FROM orders WHERE user_id = 12345;  -- 数字与字符串比较

-- ✅ 显式类型转换
SELECT * FROM orders WHERE user_id = '12345';

-- 查看是否有隐式转换
EXPLAIN SELECT * FROM orders WHERE user_id = 12345;
-- 如果看到 "Filter: ((user_id)::integer = 12345)" 说明有隐式转换
```

### 5.7 CTE 物化与内联

```sql
-- PG 12+ 默认内联简单的 CTE
WITH active_users AS (
    SELECT * FROM users WHERE status = 'active'
)
SELECT * FROM active_users WHERE age > 25;
-- 优化器可能会将 CTE 内联到主查询中

-- 强制物化（防止优化器内联）
WITH MATERIALIZED active_users AS (
    SELECT * FROM users WHERE status = 'active'
)
SELECT * FROM active_users WHERE age > 25;

-- 强制内联
WITH NOT MATERIALIZED active_users AS (
    SELECT * FROM users WHERE status = 'active'
)
SELECT * FROM active_users WHERE age > 25;
```
