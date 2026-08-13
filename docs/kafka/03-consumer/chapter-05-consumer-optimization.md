# 消费者优化

## 1. 多线程消费

```java
// 方案1：多消费者实例
for (int i = 0; i < 10; i++) {
    new Thread(() -> {
        KafkaConsumer<String, String> consumer = createConsumer();
        consumer.subscribe(Arrays.asList("topic"));
        while (true) {
            ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
            // 处理消息
        }
    }).start();
}

// 方案2：单消费者多线程处理
ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
ExecutorService executor = Executors.newFixedThreadPool(10);
for (ConsumerRecord<String, String> record : records) {
    executor.submit(() -> processMessage(record));
}
```

## 2. 批量处理

```java
props.put("max.poll.records", 1000);  // 增加单次拉取条数
```

## 3. 背压机制

```java
// 控制处理速度，避免内存溢出
if (records.count() > 0) {
    processBatch(records);
    consumer.commitSync();
}
```

---
*待补充：更多消费者优化*
