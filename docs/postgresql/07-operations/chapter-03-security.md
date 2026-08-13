# 安全

## 1. 认证配置

```conf
# pg_hba.conf
# TYPE  DATABASE  USER      ADDRESS     METHOD
host    all       all       0.0.0.0/0   scram-sha-256
host    replicator all      0.0.0.0/0   scram-sha-256
```

## 2. SSL 配置

```conf
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
*待补充：更多安全场景*
