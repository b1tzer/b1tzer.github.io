# 批量发送与压缩

## 1. 批量发送

```java
props.put("batch.size", 16384);      // 批量大小（字节）
props.put("linger.ms", 5);           // 等待时间（毫秒）
```

原理：消息先进入 RecordAccumulator，按分区聚合，达到 batch.size 或 linger.ms 后批量发送。

## 2. 压缩算法

| 算法 | 压缩比 | CPU | 推荐 |
|------|--------|-----|------|
| none | - | - | 默认 |
| gzip | 高 | 高 | 存储敏感 |
| snappy | 中 | 低 | 通用 |
| lz4 | 中 | 低 | 通用 |
| zstd | 高 | 中 | Kafka 2.1+ |

```java
props.put("compression.type", "lz4");
```

## 3. 端到端压缩

- 生产者压缩 → Broker 存储压缩数据 → 消费者解压
- Broker 无需解压，性能最优

---
*待补充：更多压缩细节*
