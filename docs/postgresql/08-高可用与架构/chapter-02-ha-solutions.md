# 高可用方案

## 1. Patroni

```yaml
# patroni.yml
scope: pg-cluster
name: node1
restapi:
  listen: 0.0.0.0:8008
postgresql:
  data_dir: /var/lib/postgresql/16/main
  listen: 0.0.0.0:5432
  authentication:
    superuser:
      username: postgres
      password: secret
    replication:
      username: replicator
      password: secret
```

## 2. repmgr

```bash
# 注册主节点
repmgr primary register
# 注册从节点
repmgr standby register
# 查看集群状态
repmgr cluster show
```

## 3. pg_auto_failover

```bash
pg_autoctl create postgres --pgdata /var/lib/postgresql/16/main
```

---
*待补充：更多 HA 方案*
