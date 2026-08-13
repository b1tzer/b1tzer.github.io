# 分片

## 1. Citus

```sql
CREATE EXTENSION citus;
-- 创建分布式表
SELECT create_distributed_table('orders', 'user_id');
```

## 2. 应用层分片

```java
// 根据 user_id 路由到不同数据源
String shard = "pg_" + (userId % 4);
```

## 3. 分片策略

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| 范围分片 | 按ID/时间范围 | 时序数据 |
| 哈希分片 | 按hash值 | 均匀分布 |
| 列表分片 | 按枚举值 | 多租户 |

---
*待补充：更多分片场景*
