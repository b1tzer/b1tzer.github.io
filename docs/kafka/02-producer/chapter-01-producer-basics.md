# 生产者 API

## 1. 基本用法

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

KafkaProducer<String, String> producer = new KafkaProducer<>(props);

// 同步发送
ProducerRecord<String, String> record = new ProducerRecord<>("my-topic", "key", "value");
producer.send(record).get();

// 异步发送
producer.send(record, (metadata, exception) -> {
    if (exception == null) {
        System.out.println("offset: " + metadata.offset());
    }
});

producer.close();
```

## 2. 发送流程

```
Producer → 拦截器 → 序列化器 → 分区器 → RecordAccumulator → Sender → Broker
```

## 3. 核心参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| bootstrap.servers | Broker 地址 | - |
| acks | 确认机制 | all |
| retries | 重试次数 | Integer.MAX_VALUE |
| batch.size | 批量大小 | 16384 |
| linger.ms | 等待时间 | 0 |
| buffer.memory | 缓冲区大小 | 33554432 |

---
*待补充：更多生产者细节*
