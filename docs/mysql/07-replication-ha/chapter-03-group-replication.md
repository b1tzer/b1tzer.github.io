# 组复制 (MGR)

## 1. 什么是 MGR

MySQL Group Replication，基于 Paxos 协议的多主复制。

## 2. 配置

```ini
# my.cnf
plugin_load_add = 'group_replication.so'
group_replication_group_name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
group_replication_start_on_boot = OFF
group_replication_local_address = "192.168.1.100:33061"
group_replication_group_seeds = "192.168.1.100:33061,192.168.1.101:33061,192.168.1.102:33061"
group_replication_single_primary_mode = ON  # 单主模式
```

## 3. 单主 vs 多主

| 模式 | 说明 |
|------|------|
| 单主 | 只有一个可写，其他只读（推荐） |
| 多主 | 所有节点可写，需处理冲突 |

## 4. 监控

```sql
SELECT * FROM performance_schema.replication_group_members;
SELECT * FROM performance_schema.replication_group_member_stats;
```

---
*待补充：更多 MGR 细节*
