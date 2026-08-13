# Kafka Streams 概览

## 1. 什么是 Kafka Streams

- 客户端库，无需集群
- 从 Kafka 读取、处理、写入 Kafka
- 支持 DSL 和 Processor API

## 2. DSL 示例

```java
StreamsBuilder builder = new StreamsBuilder();

KStream<String, String> stream = builder.stream("input-topic");

KTable<String, Long> counts = stream
    .flatMapValues(value -> Arrays.asList(value.split(" ")))
    .groupBy((key, word) -> word)
    .count();

counts.toStream().to("output-topic", Produced.with(Serdes.String(), Serdes.Long()));
```

## 3. 核心概念

| 概念 | 说明 |
|------|------|
| KStream | 流，无界数据集 |
| KTable | 表，变更日志 |
| GlobalKTable | 全局表，每个实例都有全量数据 |

## 4. 优势

- 轻量级，无需集群
- 端到端 Exactly Once
- 状态存储（RocksDB）
- 窗口操作

---
*待补充：更多 Streams 细节*
