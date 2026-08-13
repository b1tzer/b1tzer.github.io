# 事务生产者

## 1. 事务 API

```java
Properties props = new Properties();
props.put("bootstrap.servers", "localhost:9092");
props.put("transactional.id", "my-transactional-id");
props.put("enable.idempotence", true);

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
producer.initTransactions();

try {
    producer.beginTransaction();
    producer.send(new ProducerRecord<>("topic1", "key1", "value1"));
    producer.send(new ProducerRecord<>("topic2", "key2", "value2"));
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}
```

## 2. Exactly Once 语义

- 幂等生产者：单分区内 Exactly Once
- 事务生产者：跨分区 Exactly Once
- 消费-生产：read_committed 隔离级别

## 3. 配置

```java
props.put("transactional.id", "unique-id");  // 必须唯一
props.put("enable.idempotence", true);        // 必须开启
props.put("acks", "all");                     // 必须 all
```

---
*待补充：更多事务细节*
