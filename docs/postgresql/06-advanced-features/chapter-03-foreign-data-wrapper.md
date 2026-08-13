# FDW 外部数据包装器

## 1. postgres_fdw

```sql
-- 安装
CREATE EXTENSION postgres_fdw;

-- 创建外部服务器
CREATE SERVER remote_server 
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (host '192.168.1.100', port '5432', dbname 'remote_db');

-- 创建用户映射
CREATE USER MAPPING FOR local_user
    SERVER remote_server
    OPTIONS (user 'remote_user', password 'secret');

-- 创建外部表
CREATE FOREIGN TABLE remote_users (
    id INT, name VARCHAR(50)
) SERVER remote_server OPTIONS (table_name 'users');
```

## 2. file_fdw

```sql
CREATE EXTENSION file_fdw;
CREATE SERVER csv_server FOREIGN DATA WRAPPER file_fdw;
CREATE FOREIGN TABLE csv_data (id INT, name TEXT)
    SERVER csv_server OPTIONS (filename '/tmp/data.csv', format 'csv');
```

---
*待补充：更多 FDW 场景*
