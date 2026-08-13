# 索引设计

## 1. 覆盖索引

```sql
-- 查询列都在索引中，无需回表
CREATE INDEX idx_name_email ON users(name, email);
SELECT name, email FROM users WHERE name = '张三';  -- Using index
```

## 2. 前缀索引

```sql
-- 字符串字段只索引前 N 个字符
CREATE INDEX idx_email_prefix ON users(email(10));
```

## 3. 联合索引

```sql
-- 最左前缀原则
CREATE INDEX idx_a_b_c ON users(a, b, c);
-- 能用：WHERE a=1
-- 能用：WHERE a=1 AND b=2
-- 能用：WHERE a=1 AND b=2 AND c=3
-- 不能用：WHERE b=2
-- 不能用：WHERE c=3
```

## 4. 索引选择

| 场景 | 建议 |
|------|------|
| 高选择性列 | 适合索引（如 email） |
| 低选择性列 | 不适合索引（如 status） |
| 频繁查询 | 必须索引 |
| 频繁更新 | 谨慎索引 |

---
*待补充：更多索引设计场景*
