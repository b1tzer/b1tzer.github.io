# 连接池

## 1. PgBouncer

```ini
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

## 2. Pgpool-II

```conf
backend_hostname0 = '127.0.0.1'
backend_port0 = 5432
backend_weight0 = 1
```

## 3. 对比

| 特性 | PgBouncer | Pgpool-II |
|------|-----------|-----------|
| 连接池 | ✅ | ✅ |
| 负载均衡 | ❌ | ✅ |
| 复制 | ❌ | ✅ |
| 复杂度 | 低 | 高 |

---
*待补充：更多连接池配置*
