# Exactly Once 语义

## 1. 三种语义

| 语义 | 说明 | 实现 |
|------|------|------|
| At Most Once | 最多一次，可能丢消息 | acks=0 |
| At Least Once | 至少一次，可能重复 | acks=all + 重试 |
| Exactly Once | 精确一次 | 幂等 + 事务 |

## 2. 幂等生产者

```properties
enable.idempotence=true
acks=all
retries=Integer.MAX_VALUE
```

原理：PID + Sequence Number 去重。

## 3. 事务

```java
producer.initTransactions();
producer.beginTransaction();
// 发送消息
producer.commitTransaction();
```

## 4. 消费端 Exactly Once

```properties
isolation.level=read_committed
```

- 只读取已提交事务的消息
- 配合消费者 Offset 手动提交

---
*待补充：更多 Exactly Once 细节*
