# 安全

## 1. 权限体系

```sql
-- 创建用户
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secret';

-- 授权
GRANT SELECT, INSERT, UPDATE ON mydb.* TO 'app_user'@'%';
GRANT ALL PRIVILEGES ON mydb.* TO 'admin'@'%';

-- 撤权
REVOKE INSERT ON mydb.* FROM 'app_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;
```

## 2. SSL

```ini
[mysqld]
ssl-ca = /etc/mysql/ssl/ca.pem
ssl-cert = /etc/mysql/ssl/server-cert.pem
ssl-key = /etc/mysql/ssl/server-key.pem
require_secure_transport = ON
```

## 3. 审计

```sql
-- 安装审计插件
INSTALL PLUGIN audit_log SONAME 'audit_log.so';
```

## 4. 数据加密

```sql
-- 表空间加密
ALTER TABLE users ENCRYPTION='Y';
```

---
*待补充：更多安全场景*
