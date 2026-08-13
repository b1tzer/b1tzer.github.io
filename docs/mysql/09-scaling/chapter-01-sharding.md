# 分库分表

## 1. 垂直拆分

```
用户库: users, user_profiles
订单库: orders, order_items
商品库: products, categories
```

## 2. 水平拆分

```yaml
# ShardingSphere 配置
spring:
  shardingsphere:
    rules:
      sharding:
        tables:
          orders:
            actual-data-nodes: ds_${0..1}.orders_${0..7}
            database-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: db_inline
            table-strategy:
              standard:
                sharding-column: order_id
                sharding-algorithm-name: table_inline
```

## 3. 分片策略

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| 范围分片 | 按 ID/时间范围 | 时序数据 |
| 哈希分片 | 按 hash 值 | 均匀分布 |
| 一致性哈希 | 节点变更影响小 | 动态扩容 |

## 4. 分布式 ID

```java
// 雪花算法
SnowflakeIdGenerator generator = new SnowflakeIdGenerator(1, 1);
long id = generator.nextId();
```

---
*待补充：更多分库分表场景*
