# 流复制

## 1. 主库配置

```conf
# postgresql.conf
wal_level = replica
max_wal_senders = 10
wal_keep_size = '1GB'
```

```conf
# pg_hba.conf
host replication replicator 0.0.0.0/0 scram-sha-256
```

## 2. 从库搭建

```bash
# 基础备份
pg_basebackup -h master_host -U replicator -D /var/lib/postgresql/16/main -Xs -P

# 配置 standby
cat > standby.signal << EOF
primary_conninfo = 'host=master_host user=replicator password=secret'
EOF
```

## 3. 监控

```sql
-- 主库
SELECT * FROM pg_stat_replication;
-- 从库
SELECT * FROM pg_stat_wal_receiver;
```

---
*待补充：更多复制场景*
