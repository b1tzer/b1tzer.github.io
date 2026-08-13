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

---
*待补充：更多 SQL 语法*
