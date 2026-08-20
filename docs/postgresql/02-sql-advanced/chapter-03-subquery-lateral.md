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
## 4. 高级查询技巧

### 4.1 批量插入

```sql
-- 批量插入（比逐条 INSERT 快 10-100 倍）
INSERT INTO users (username, email) VALUES
    ('user1', 'user1@example.com'),
    ('user2', 'user2@example.com'),
    ('user3', 'user3@example.com');

-- 从查询结果插入
INSERT INTO users_archive (id, username, email)
SELECT id, username, email FROM users WHERE created_at < '2023-01-01';

-- UPSERT（INSERT ON CONFLICT，PG 独有语法）
INSERT INTO users (username, email)
VALUES ('张三', 'new@example.com')
ON CONFLICT (username)
DO UPDATE SET email = EXCLUDED.email;

-- 忽略冲突
INSERT INTO users (username, email)
VALUES ('张三', 'zhangsan@example.com')
ON CONFLICT DO NOTHING;
```

### 4.2 RETURNING 子句

```sql
-- INSERT 后返回生成的 ID 和插入的数据
INSERT INTO users (username, email)
VALUES ('李四', 'lisi@example.com')
RETURNING id, username;

-- UPDATE 后返回修改前后的数据
UPDATE users SET email = 'updated@example.com'
WHERE id = 1
RETURNING id, email;

-- DELETE 后返回被删除的数据
DELETE FROM users WHERE id = 1
RETURNING id, username;
```

### 4.3 CTE 数据修改

```sql
-- CTE 中执行 DELETE 并返回被删除的数据
WITH deleted AS (
    DELETE FROM orders
    WHERE created_at < '2023-01-01'
    RETURNING *
)
INSERT INTO orders_archive SELECT * FROM deleted;

-- CTE 中执行 UPDATE 并记录变更
WITH updated AS (
    UPDATE products SET price = price * 0.9
    WHERE category = '电子产品'
    RETURNING id, name, price
)
INSERT INTO price_change_log (product_id, new_price)
SELECT id, price FROM updated;
```

### 4.4 FILTER 子句

```sql
-- FILTER 子句：条件聚合（比 CASE WHEN 更简洁）
SELECT
    department,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE salary > 10000) AS high_salary_count,
    AVG(salary) FILTER (WHERE status = 'active') AS active_avg_salary
FROM employees
GROUP BY department;
```

### 4.5 通用表表达式与 DML

```sql
-- 多表关联更新
UPDATE orders o
SET status = 'shipped'
FROM users u
WHERE o.user_id = u.id
  AND u.region = 'north'
  AND o.status = 'pending';

-- 多表关联删除
DELETE FROM order_items oi
USING orders o
WHERE oi.order_id = o.id
  AND o.status = 'cancelled';
```

### 4.6 GROUPING SETS / CUBE / ROLLUP

```sql
-- GROUPING SETS：自定义分组组合
SELECT department, region, SUM(salary)
FROM employees
GROUP BY GROUPING SETS (
    (department, region),
    (department),
    (region),
    ()
);

-- ROLLUP：层级汇总（department → 总计）
SELECT department, region, SUM(salary)
FROM employees
GROUP BY ROLLUP (department, region);

-- CUBE：所有维度组合的汇总
SELECT department, region, SUM(salary)
FROM employees
GROUP BY CUBE (department, region);
```

### 4.7 DISTINCT ON（PG 独有）

```sql
-- 取每个部门薪资最高的员工（PG 独有语法）
SELECT DISTINCT ON (department)
    department, name, salary
FROM employees
ORDER BY department, salary DESC;

-- 等价的窗口函数写法（其他数据库也支持）
SELECT department, name, salary FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rn
    FROM employees
) t WHERE rn = 1;
```
