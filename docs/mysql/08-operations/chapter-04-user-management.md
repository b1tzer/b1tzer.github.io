# 用户管理

## 1. 角色 (8.0+)

```sql
-- 创建角色
CREATE ROLE 'app_read', 'app_write';

-- 授权角色
GRANT SELECT ON mydb.* TO 'app_read';
GRANT INSERT, UPDATE, DELETE ON mydb.* TO 'app_write';

-- 分配角色
GRANT 'app_read', 'app_write' TO 'app_user'@'%';
SET DEFAULT ROLE ALL TO 'app_user'@'%';
```

## 2. 权限查看

```sql
-- 查看用户权限
SHOW GRANTS FOR 'app_user'@'%';

-- 查看角色
SELECT * FROM mysql.role_edges;
```

## 3. 密码策略

```sql
-- 密码过期
ALTER USER 'app_user'@'%' PASSWORD EXPIRE INTERVAL 90 DAY;

-- 密码复杂度
SET GLOBAL validate_password.length = 8;
SET GLOBAL validate_password.mixed_case_count = 1;
```

---
*待补充：更多用户管理场景*
