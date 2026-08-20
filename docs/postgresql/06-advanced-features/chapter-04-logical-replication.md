# 逻辑复制

## 1. 发布端配置

```ini
# postgresql.conf
wal_level = logical
```

```sql
-- 创建发布
CREATE PUBLICATION my_pub FOR TABLE users, orders;
-- 或发布所有表
CREATE PUBLICATION my_pub FOR ALL TABLES;
```

## 2. 订阅端配置

```sql
-- 创建订阅
CREATE SUBSCRIPTION my_sub
    CONNECTION 'host=192.168.1.100 dbname=mydb user=replicator password=secret'
    PUBLICATION my_pub;
```

## 3. 监控

```sql
-- 查看订阅状态
SELECT * FROM pg_stat_subscription;
-- 查看复制槽
SELECT * FROM pg_replication_slots;
```
## 4. 更多逻辑复制场景

### 4.1 选择性复制

```sql
-- 只发布特定表
CREATE PUBLICATION user_pub FOR TABLE users, user_profiles;

-- 发布特定操作
CREATE PUBLICATION insert_only FOR TABLE audit_logs
    WITH (publish = 'insert');

-- 发布所有表
CREATE PUBLICATION all_tables FOR ALL TABLES;

-- 修改发布
ALTER PUBLICATION user_pub ADD TABLE orders;
ALTER PUBLICATION user_pub DROP TABLE user_profiles;

-- 查看发布
SELECT * FROM pg_publication;
SELECT * FROM pg_publication_tables;
```

### 4.2 监控复制状态

```sql
-- 查看订阅状态
SELECT
    subname,
    worker_type,
    last_msg_send_time,
    last_msg_receipt_time,
    latest_end_lsn,
    last_xact_replay_lag
FROM pg_stat_subscription;

-- 查看复制槽
SELECT
    slot_name,
    plugin,
    slot_type,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;

-- 查看逻辑复制的工作进程
SELECT pid, backend_type, query
FROM pg_stat_activity
WHERE backend_type LIKE '%logical%';
```

### 4.3 逻辑复制的限制

| 限制 | 说明 |
|------|------|
| DDL 不复制 | 表结构变更需要手动在订阅端执行 |
| 序列不复制 | SEQUENCE 的值不会自动同步 |
| TRUNCATE 不复制 | 默认不复制 TRUNCATE 操作 |
| 大对象不复制 | Large Objects 不支持逻辑复制 |
| 需要主键 | 默认需要表有主键（或 REPLICA IDENTITY） |

```sql
-- 设置 REPLICA IDENTITY（无主键表）
ALTER TABLE logs REPLICA IDENTITY FULL;

-- 启用 TRUNCATE 复制（PG 14+）
CREATE PUBLICATION my_pub FOR ALL TABLES WITH (publish = 'insert, update, delete, truncate');
```

### 4.4 逻辑复制用于数据迁移

```sql
-- 场景：从 PG 14 迁移到 PG 16
-- 1. 在 PG 16 上创建相同的表结构
-- 2. 在 PG 14 上创建发布
CREATE PUBLICATION migration_pub FOR ALL TABLES;

-- 3. 在 PG 16 上创建订阅
CREATE SUBSCRIPTION migration_sub
    CONNECTION 'host=pg14_host dbname=mydb user=replicator password=secret'
    PUBLICATION migration_pub
    WITH (copy_data = true);  -- 复制初始数据

-- 4. 等待数据同步完成
SELECT * FROM pg_stat_subscription;

-- 5. 切换应用到 PG 16
-- 6. 删除订阅和发布
DROP SUBSCRIPTION migration_sub;
DROP PUBLICATION migration_pub;
```

### 4.5 逻辑复制用于数据分发

```sql
-- 场景：主库数据分发到多个分析库
-- 主库：创建发布
CREATE PUBLICATION analytics_pub FOR TABLE orders, users;

-- 分析库1：订阅订单数据
CREATE SUBSCRIPTION analytics_sub1
    CONNECTION 'host=master dbname=mydb user=reader password=secret'
    PUBLICATION analytics_pub;

-- 分析库2：也可以独立订阅
CREATE SUBSCRIPTION analytics_sub2
    CONNECTION 'host=master dbname=mydb user=reader password=secret'
    PUBLICATION analytics_pub;

-- 清理不再需要的复制槽（防止 WAL 堆积）
SELECT pg_drop_replication_slot('slot_name');
```

> **重要**：逻辑复制槽如果不活跃，会导致 WAL 文件不断堆积，最终磁盘满。务必监控复制槽状态，及时清理不活跃的复制槽。
