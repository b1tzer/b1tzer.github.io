# ACK 机制与重试

## 1. ACK 机制

| acks | 说明 | 可靠性 | 吞吐量 |
|------|------|--------|--------|
| 0 | 不等待确认 | 低 | 高 |
| 1 | Leader 确认 | 中 | 中 |
| all | ISR 全部确认 | 高 | 低 |

## 2. 幂等生产者

```java
props.put("enable.idempotence", true);  // 开启幂等
props.put("acks", "all");
props.put("retries", Integer.MAX_VALUE);
```

原理：PID + Sequence Number 去重。

## 3. 重试机制

```java
props.put("retries", 3);
props.put("retry.backoff.ms", 100);
```

## 4. 消息丢失与重复

| 场景 | 原因 | 解决 |
|------|------|------|
| 丢失 | acks=0/1，Leader 宕机 | acks=all |
| 重试重复 | 网络超时重试 | 幂等生产者 |
| 消费重复 | Offset 提交失败 | 幂等消费 |

---
*待补充：更多可靠性细节*
