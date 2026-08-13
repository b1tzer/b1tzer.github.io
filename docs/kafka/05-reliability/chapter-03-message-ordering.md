# 消息顺序保证

## 1. 分区内顺序

- 单分区内消息有序
- 跨分区无序

## 2. 实现方式

```java
// 相同 Key 的消息发到同一分区
producer.send(new ProducerRecord<>("topic", "user-123", "msg1"));
producer.send(new ProducerRecord<>("topic", "user-123", "msg2"));
```

## 3. 全局有序

```java
// 只使用 1 个分区（牺牲性能）
props.put("num.partitions", 1);
```

## 4. 顺序与重试

```properties
# 保证顺序，关闭重试（牺牲可靠性）
retries=0

# 或使用幂等生产者（推荐）
enable.idempotence=true
max.in.flight.requests.per.connection=5
```

---
*待补充：更多顺序保证细节*
