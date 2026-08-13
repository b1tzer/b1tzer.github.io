# Rebalance 策略

## 1. Range 策略

按分区范围分配，可能导致不均衡。

## 2. RoundRobin 策略

轮询分配，更均衡，但可能打乱原有分配。

## 3. Sticky 策略

尽量保持原有分配，减少 Rebalance 影响。

## 4. CooperativeSticky 策略

协作式粘性，逐步迁移，避免 Stop-the-World。

```java
props.put("partition.assignment.strategy", 
    "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
```

## 5. 优化建议

1. 使用 CooperativeSticky 策略
2. 合理设置 session.timeout.ms
3. 及时处理消息，避免 poll 超时
4. 使用静态成员 ID

```java
props.put("group.instance.id", "consumer-1");  // 静态成员
```

---
*待补充：更多 Rebalance 细节*
