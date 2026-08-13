# Offset 管理

## 1. 自动提交

```java
props.put("enable.auto.commit", true);
props.put("auto.commit.interval.ms", 5000);
```

问题：可能丢消息或重复消费。

## 2. 手动提交

```java
// 同步提交
consumer.commitSync();

// 异步提交
consumer.commitAsync((offsets, exception) -> {
    if (exception != null) {
        System.err.println("Commit failed: " + exception);
    }
});

// 指定 Offset 提交
consumer.commitSync(Collections.singletonMap(
    new TopicPartition("topic", 0), 
    new OffsetAndMetadata(offset + 1)
));
```

## 3. 指定 Offset 消费

```java
// 从头消费
consumer.seekToBeginning(partitions);

// 从末尾消费
consumer.seekToEnd(partitions);

// 指定 Offset
consumer.seek(new TopicPartition("topic", 0), 100);
```

## 4. Offset 存储

- 存储在 `__consumer_offsets` 主题中
- Key：group.id + topic + partition
- Value：offset

---
*待补充：更多 Offset 细节*
