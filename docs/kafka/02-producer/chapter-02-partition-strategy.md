# 分区策略

## 1. 默认策略

```java
// 1. 指定分区
new ProducerRecord<>("topic", 0, "key", "value");

// 2. 有 key → hash(key) % 分区数
new ProducerRecord<>("topic", "key", "value");

// 3. 无 key → 轮询（粘性分区）
new ProducerRecord<>("topic", "value");
```

## 2. 自定义分区器

```java
public class CustomPartitioner implements Partitioner {
    @Override
    public int partition(String topic, Object key, byte[] keyBytes, 
                         Object value, byte[] valueBytes, Cluster cluster) {
        // 自定义分区逻辑
        return Math.abs(key.hashCode()) % cluster.partitionCountForTopic(topic);
    }
}

// 配置
props.put("partitioner.class", "com.example.CustomPartitioner");
```

## 3. 分区与顺序

- 单分区内：消息有序
- 跨分区：无序
- 需要全局有序：只用 1 个分区（牺牲性能）

---
*待补充：更多分区策略*
