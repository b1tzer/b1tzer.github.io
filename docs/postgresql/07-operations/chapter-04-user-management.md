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
## 3. 更多权限场景

### 3.1 角色继承与层级

```sql
-- 创建角色层级
CREATE ROLE readonly;
CREATE ROLE readwrite;
CREATE ROLE admin;

-- 权限分配
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
GRANT readonly TO readwrite;  -- 继承 readonly 的权限
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
GRANT readwrite TO admin;  -- 继承 readwrite 的权限
GRANT CREATE ON DATABASE mydb TO admin;

-- 将用户分配到角色
CREATE USER reader1 WITH PASSWORD 'secret';
GRANT readonly TO reader1;

CREATE USER writer1 WITH PASSWORD 'secret';
GRANT readwrite TO writer1;

-- 查看角色成员
SELECT r.rolname AS role, m.rolname AS member
FROM pg_auth_members am
JOIN pg_roles r ON r.oid = am.roleid
JOIN pg_roles m ON m.oid = am.member;
```

### 3.2 Schema 权限

```sql
-- 创建独立的 schema
CREATE SCHEMA app;

-- 授权
GRANT USAGE ON SCHEMA app TO app_user;
GRANT CREATE ON SCHEMA app TO app_user;

-- 在 schema 下创建表
CREATE TABLE app.users (id SERIAL PRIMARY KEY, name TEXT);

-- 撤销 public schema 的默认权限
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE mydb FROM PUBLIC;
```

### 3.3 列级权限

```sql
-- 只允许查看特定列
CREATE ROLE hr_user;
GRANT SELECT (name, department, salary) ON employees TO hr_user;

-- 只允许更新特定列
CREATE ROLE self_service;
GRANT SELECT (id, name, email, phone) ON employees TO self_service;
GRANT UPDATE (email, phone) ON employees TO self_service;

-- 查看列权限
SELECT grantee, table_name, privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public';
```

### 3.4 行级安全策略（RLS）

```sql
-- 启用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能看到自己的订单
CREATE POLICY user_orders ON orders
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::INT);

-- 设置当前用户（应用层设置）
SET app.current_user_id = '123';
SELECT * FROM orders;  -- 只返回 user_id = 123 的订单

-- 创建策略：管理员可以看到所有订单
CREATE POLICY admin_orders ON orders
    FOR ALL
    TO admin_role
    USING (true);

-- 查看 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'orders';
```

### 3.5 默认权限

```sql
-- 设置新建表的默认权限（对现有表不生效）
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO readwrite;

-- 设置新建序列的默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO readwrite;

-- 查看默认权限
SELECT * FROM pg_default_acl;
```

### 3.6 权限审计

```sql
-- 查看所有角色的权限
SELECT
    r.rolname,
    r.rolsuper,
    r.rolcreatedb,
    r.rolcreaterole,
    r.rolreplication,
    r.rolcanlogin
FROM pg_roles r
WHERE r.rolname NOT LIKE 'pg_%'
ORDER BY r.rolname;

-- 查看表权限
SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY grantee, table_name;

-- 查看哪些角色有超级用户权限
SELECT rolname FROM pg_roles WHERE rolsuper = true;
```
