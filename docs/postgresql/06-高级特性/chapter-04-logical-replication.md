# 逻辑复制

## 1. 发布端配置

```conf
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

---
*待补充：更多逻辑复制场景*
