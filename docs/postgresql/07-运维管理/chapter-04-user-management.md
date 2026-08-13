# 用户管理

## 1. 角色

```sql
-- 创建角色
CREATE ROLE app_user WITH LOGIN PASSWORD 'secret';
CREATE ROLE admin_role WITH CREATEDB CREATEROLE;

-- 授权
GRANT app_user TO admin_role;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO app_user;

-- 默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT ON TABLES TO app_user;
```

## 2. 权限体系

```sql
-- 数据库级
GRANT CREATE ON DATABASE mydb TO app_user;

-- Schema 级
GRANT USAGE ON SCHEMA public TO app_user;

-- 表级
GRANT SELECT, INSERT, UPDATE ON users TO app_user;

-- 列级
GRANT SELECT (name, email) ON users TO app_user;
```

---
*待补充：更多权限场景*
