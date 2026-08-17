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

```ini
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
## 4. 更多连接池配置

### 4.1 PgBouncer 配置详解

```ini
# /etc/pgbouncer/pgbouncer.ini

[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb
# 路由到不同数据库
mydb_ro = host=192.168.1.102 port=5432 dbname=mydb

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# 连接池模式
pool_mode = transaction  # session|transaction|statement

# 连接数限制
max_client_conn = 1000   # 最大客户端连接数
default_pool_size = 25    # 每个数据库的连接池大小
min_pool_size = 5         # 最小保持的连接数
reserve_pool_size = 5     # 预留连接数
reserve_pool_timeout = 3  # 预留连接等待超时（秒）

# 超时设置
server_idle_timeout = 300
server_lifetime = 3600
server_connect_timeout = 15
client_idle_timeout = 0
client_login_timeout = 60
query_timeout = 0
query_wait_timeout = 120

# 日志
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60
```

```bash
# userlist.txt 格式
"username" "password_hash"

# 生成密码哈希
psql -c "SELECT usename, passwd FROM pg_shadow" > /etc/pgbouncer/userlist.txt

# 启动 PgBouncer
pgbouncer -d /etc/pgbouncer/pgbouncer.ini

# 管理命令（连接到 PgBouncer 管理端口）
psql -p 6432 -U admin pgbouncer
SHOW POOLS;     -- 查看连接池状态
SHOW CLIENTS;   -- 查看客户端连接
SHOW SERVERS;   -- 查看服务器连接
SHOW STATS;     -- 查看统计信息
RELOAD;         -- 重载配置
PAUSE mydb;     -- 暂停连接池
RESUME mydb;    -- 恢复连接池
```

### 4.2 连接池模式对比

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| session | 连接绑定会话，会话结束才释放 | 使用会话级变量、PREPARE |
| transaction | 事务结束即释放连接 | **推荐大多数场景** |
| statement | 语句结束即释放（不支持多语句事务） | 极少数场景 |

> **最佳实践**：大多数场景使用 `transaction` 模式。如果应用使用了 `SET` 命令、临时表、会话级变量，需要使用 `session` 模式。

### 4.3 Spring Boot 集成 PgBouncer

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://pgbouncer-host:6432/mydb
    username: app_user
    password: secret
    hikari:
      maximum-pool-size: 20        # HikariCP 连接池大小
      minimum-idle: 5
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

### 4.4 Pgpool-II 配置

```ini
# pgpool.conf
backend_hostname0 = '192.168.1.101'
backend_port0 = 5432
backend_weight0 = 1
backend_flag0 = 'ALWAYS_PRIMARY'

backend_hostname1 = '192.168.1.102'
backend_port1 = 5432
backend_weight1 = 1
backend_flag1 = 'DISALLOW_TO_FAILOVER'

# 负载均衡
load_balance_mode = on

# 连接池
num_init_children = 32
max_pool = 4
child_life_time = 300

# 查询缓存
enable_query_cache = on
query_cache_memory = 64MB
```

### 4.5 连接池监控

```sql
-- PgBouncer 管理命令
SHOW POOLS;
-- 每个连接池显示：
-- cl_active: 活跃客户端连接
-- cl_waiting: 等待中的客户端连接
-- sv_active: 活跃服务器连接
-- sv_idle: 空闲服务器连接

SHOW STATS;
-- 显示每个数据库的：
-- total_xact_count: 总事务数
-- avg_xact_time: 平均事务时间
-- total_sent/recv: 网络流量
```

### 4.6 连接池最佳实践

| 实践 | 说明 |
|------|------|
| 使用 transaction 模式 | 大多数场景最优 |
| 合理设置 pool_size | 建议 = CPU 核心数 × 2 + 磁盘数 |
| 配合应用连接池 | PgBouncer 连接池 + HikariCP 应用连接池 |
| 监控等待队列 | `cl_waiting > 0` 说明连接池不足 |
| 避免长事务 | 长事务占用连接池连接，影响其他请求 |
| 定期清理空闲连接 | 设置合理的 `server_idle_timeout` |
