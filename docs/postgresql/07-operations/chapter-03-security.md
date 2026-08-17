# 安全

## 1. 认证配置

```ini
# pg_hba.conf
# TYPE  DATABASE  USER      ADDRESS     METHOD
host    all       all       0.0.0.0/0   scram-sha-256
host    replicator all      0.0.0.0/0   scram-sha-256
```

## 2. SSL 配置

```ini
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

## 3. 行级安全

```sql
CREATE POLICY user_policy ON orders
    FOR ALL
    USING (user_id = current_user_id());

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

## 4. 审计

```sql
CREATE EXTENSION pgaudit;
ALTER SYSTEM SET pgaudit.log = 'write';
```

---
## 5. 更多安全场景

### 5.1 加密连接

```ini
# 生成 SSL 证书
# openssl req -new -x509 -days 365 -nodes -text -out server.crt -keyout server.key -subj "/CN=pg-server"
# chmod 600 server.key
# chown postgres:postgres server.key server.crt

# postgresql.conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_min_protocol_version = 'TLSv1.2'
ssl_ciphers = 'HIGH:!aNULL:!MD5'
```

```ini
# pg_hba.conf - 强制 SSL 连接
hostssl all all 0.0.0.0/0 scram-sha-256
```

```sql
-- 验证 SSL 连接
SHOW ssl;
SELECT * FROM pg_stat_ssl WHERE pid = pg_backend_pid();
```

### 5.2 数据加密

```sql
-- 列级加密（使用 pgcrypto 扩展）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 加密存储
INSERT INTO users (name, secret_data)
VALUES ('张三', pgp_sym_encrypt('敏感数据', 'encryption_key'));

-- 解密查询
SELECT name, pgp_sym_decrypt(secret_data, 'encryption_key') AS data
FROM users WHERE name = '张三';

-- 哈希存储（密码等）
INSERT INTO users (name, password_hash)
VALUES ('张三', crypt('mypassword', gen_salt('bf')));

-- 验证密码
SELECT * FROM users
WHERE name = '张三'
  AND password_hash = crypt('mypassword', password_hash);
```

### 5.3 网络安全

```ini
# pg_hba.conf - IP 白名单
# 只允许特定 IP 段连接
host    mydb    app_user    10.0.1.0/24    scram-sha-256
host    mydb    app_user    10.0.2.0/24    scram-sha-256
# 拒绝其他所有连接
host    all     all         0.0.0.0/0      reject
```

```sql
-- 限制连接速率（使用 pgbouncer 或应用层限流）
-- pg_hba.conf 不支持连接速率限制，需要通过 PgBouncer 或防火墙实现
```

### 5.4 审计日志

```sql
-- 使用 pgaudit 扩展
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- 配置审计（postgresql.conf）
-- pgaudit.log = 'write, ddl, role'
-- pgaudit.log_catalog = off
-- pgaudit.log_relation = on

-- 细粒度审计
ALTER ROLE auditor SET pgaudit.log = 'all';

-- 查看审计日志
tail -f /var/log/postgresql/postgresql-16-main.log | grep AUDIT
```

### 5.5 SQL 注入防护

```sql
-- ❌ 动态拼接 SQL（有注入风险）
-- EXECUTE 'SELECT * FROM users WHERE name = ''' || user_input || '''';

-- ✅ 使用参数化查询
PREPARE user_query AS SELECT * FROM users WHERE name = $1;
EXECUTE user_query('张三');

-- ✅ 使用 format 函数（%I 自动加引号，%L 自动加引号和转义）
EXECUTE format('SELECT * FROM %I WHERE name = %L', table_name, user_input);

-- ✅ 使用 quote_ident 和 quote_literal
EXECUTE 'SELECT * FROM ' || quote_ident(table_name) || ' WHERE name = ' || quote_literal(user_input);
```

### 5.6 最小权限原则

```sql
-- 创建只读用户
CREATE ROLE readonly_user WITH LOGIN PASSWORD 'secret';
GRANT CONNECT ON DATABASE mydb TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;

-- 创建应用用户（只能读写特定表）
CREATE ROLE app_user WITH LOGIN PASSWORD 'secret';
GRANT CONNECT ON DATABASE mydb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON users, orders TO app_user;

-- 禁止用户创建对象
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
```
