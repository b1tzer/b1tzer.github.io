# 高可用方案

## 1. MHA

Master High Availability，自动故障切换。

```bash
# 检查复制状态
masterha_check_repl --conf=/etc/mha/app1.cnf

# 启动 MHA Manager
masterha_manager --conf=/etc/mha/app1.cnf
```

## 2. Orchestrator

```bash
# 安装
orchestrator --config=/etc/orchestrator.conf.json http

# 查看拓扑
orchestrator-client -c topology -i mycluster
```

## 3. InnoDB Cluster

MySQL 官方高可用方案，基于 MGR + MySQL Shell + MySQL Router。

```javascript
// MySQL Shell
dba.configureInstance('root@192.168.1.100:3306')
dba.createCluster('myCluster')
cluster.addInstance('root@192.168.1.101:3306')
cluster.addInstance('root@192.168.1.102:3306')
```

## 4. 对比

| 方案 | 自动切换 | 数据一致性 | 复杂度 |
|------|---------|-----------|--------|
| MHA | ✅ | 依赖 GTID | 中 |
| Orchestrator | ✅ | 依赖 GTID | 中 |
| InnoDB Cluster | ✅ | 强一致 | 低 |

---
*待补充：更多 HA 方案*
