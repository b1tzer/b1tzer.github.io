# 消费者组与 Rebalance

## 1. 消费者组

- 同一组内，每个分区只被一个消费者消费
- 不同组之间，独立消费
- 消费者数量 > 分区数：多余消费者空闲

## 2. Rebalance 触发条件

- 消费者加入/离开组
- Topic 分区数变化
- 消费者心跳超时

## 3. Rebalance 策略

| 策略 | 说明 |
|------|------|
| Range | 按范围分配 |
| RoundRobin | 轮询分配 |
| Sticky | 粘性分配，尽量保持原分配 |
| CooperativeSticky | 协作式粘性，逐步迁移 |

```java
props.put("partition.assignment.strategy", 
    "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
```

## 4. Rebalance 影响

- 消费暂停
- 可能重复消费
- 尽量避免频繁 Rebalance

---
*待补充：更多 Rebalance 细节*
