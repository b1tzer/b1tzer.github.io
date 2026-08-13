# 索引设计原则

## 1. 选择性原则

```sql
-- 高选择性列适合索引
SELECT COUNT(DISTINCT email) * 100.0 / COUNT(*) FROM users;  -- > 80% 好
SELECT COUNT(DISTINCT status) * 100.0 / COUNT(*) FROM users;  -- < 10% 差
```

## 2. 部分索引

```sql
-- 只索引活跃用户
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';
```

## 3. 表达式索引

```sql
CREATE INDEX idx_lower_email ON users(LOWER(email));
```

## 4. 多列索引

```sql
-- 顺序很重要
CREATE INDEX idx_name_age ON users(name, age);
-- 能用：WHERE name = '张三'
-- 能用：WHERE name = '张三' AND age > 25
-- 不能用：WHERE age > 25
```

## 5. 覆盖索引

```sql
CREATE INDEX idx_covering ON users(name, age) INCLUDE (email);
-- 查询只需索引，不回表
SELECT name, age, email FROM users WHERE name = '张三';
```

---
*待补充：更多索引设计场景*
