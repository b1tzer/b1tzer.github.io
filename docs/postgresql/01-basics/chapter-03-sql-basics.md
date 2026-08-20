# SQL 基础

## 1. DDL

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN age INTEGER;
DROP TABLE IF EXISTS users;
```

## 2. DML

```sql
INSERT INTO users (username, email) VALUES ('张三', 'zhangsan@example.com');
UPDATE users SET email = 'new@example.com' WHERE id = 1;
DELETE FROM users WHERE id = 1;
```

## 3. DCL

```sql
CREATE ROLE app_user WITH LOGIN PASSWORD 'secret';
GRANT SELECT, INSERT ON users TO app_user;
REVOKE INSERT ON users FROM app_user;
```
## 4. 高级 SQL 语法

### 4.1 批量操作

```sql
-- 批量插入
INSERT INTO users (username, email) VALUES
    ('user1', 'user1@example.com'),
    ('user2', 'user2@example.com'),
    ('user3', 'user3@example.com');

-- UPSERT（INSERT ON CONFLICT）
INSERT INTO users (username, email)
VALUES ('张三', 'new@example.com')
ON CONFLICT (username)
DO UPDATE SET email = EXCLUDED.email;

-- 从查询结果插入
INSERT INTO users_archive (id, username, email)
SELECT id, username, email FROM users WHERE created_at < '2023-01-01';
```

### 4.2 RETURNING 子句

```sql
-- INSERT 后返回生成的 ID
INSERT INTO users (username, email)
VALUES ('李四', 'lisi@example.com')
RETURNING id, username;

-- UPDATE 后返回修改后的数据
UPDATE users SET email = 'updated@example.com'
WHERE id = 1
RETURNING id, email;

-- DELETE 后返回被删除的数据
DELETE FROM users WHERE id = 1
RETURNING id, username;
```

### 4.3 CTE 数据修改

```sql
-- CTE 中执行 DELETE 并归档
WITH deleted AS (
    DELETE FROM orders WHERE created_at < '2023-01-01' RETURNING *
)
INSERT INTO orders_archive SELECT * FROM deleted;

-- CTE 中执行 UPDATE 并记录变更
WITH updated AS (
    UPDATE products SET price = price * 0.9 WHERE category = '电子产品' RETURNING id, price
)
INSERT INTO price_change_log (product_id, new_price) SELECT id, price FROM updated;
```

### 4.4 FILTER 子句

```sql
-- 条件聚合（比 CASE WHEN 更简洁）
SELECT
    department,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE salary > 10000) AS high_salary_count,
    AVG(salary) FILTER (WHERE status = 'active') AS active_avg_salary
FROM employees
GROUP BY department;
```

### 4.5 GROUPING SETS / ROLLUP / CUBE

```sql
-- ROLLUP：层级汇总
SELECT department, region, SUM(salary)
FROM employees
GROUP BY ROLLUP (department, region);

-- CUBE：所有维度组合的汇总
SELECT department, region, SUM(salary)
FROM employees
GROUP BY CUBE (department, region);

-- GROUPING SETS：自定义分组组合
SELECT department, region, SUM(salary)
FROM employees
GROUP BY GROUPING SETS (
    (department, region),
    (department),
    (region),
    ()
);
```

### 4.6 DISTINCT ON（PG 独有）

```sql
-- 取每个部门薪资最高的员工
SELECT DISTINCT ON (department)
    department, name, salary
FROM employees
ORDER BY department, salary DESC;

-- 多表关联更新
UPDATE orders o
SET status = 'shipped'
FROM users u
WHERE o.user_id = u.id AND u.region = 'north' AND o.status = 'pending';

-- 多表关联删除
DELETE FROM order_items oi
USING orders o
WHERE oi.order_id = o.id AND o.status = 'cancelled';
```

### 4.7 通用表表达式

```sql
-- EXPLAIN 查看执行计划
EXPLAIN SELECT * FROM users WHERE age > 25;
EXPLAIN ANALYZE SELECT * FROM users WHERE age > 25;

-- 查看表结构
\d users
\d+ users

-- 查看所有表
\dt
\dt+

-- 查看所有索引
\di
\di+
```
