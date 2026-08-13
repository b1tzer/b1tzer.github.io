# 消费者 API

## 1. 基本用法

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("group.id", "my-group");
props.put("key.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");
props.put("value.deserializer", "org.apache.kafka.common.serialization.StringDeserializer");

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
consumer.subscribe(Arrays.asList("my-topic"));

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> record : records) {
        System.out.printf("offset=%d, key=%s, value=%s%n", 
            record.offset(), record.key(), record.value());
    }
}
```

## 2. 订阅方式

```java
// 订阅主题
consumer.subscribe(Arrays.asList("topic1", "topic2"));

// 正则订阅
consumer.subscribe(Pattern.compile("topic.*"));

// 指定分区
consumer.assign(Arrays.asList(new TopicPartition("topic", 0)));
```

## 3. 核心参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| group.id | 消费者组 | - |
| enable.auto.commit | 自动提交 | true |
| auto.commit.interval.ms | 提交间隔 | 5000 |
| max.poll.records | 单次拉取最大条数 | 500 |
| session.timeout.ms | 会话超时 | 45000 |

---
*待补充：更多消费者细节*
