# Streams Exactly Once

## 1. 配置

```java
Properties props = new Properties();
props.put("processing.guarantee", "exactly_once_v2");
```

## 2. 实现原理

- 幂等生产者
- 事务
- 原子性写入

## 3. 限制

- 必须使用 Kafka 作为 Source 和 Sink
- 性能有一定损耗

## 4. At Least Once vs Exactly Once

| 模式 | 配置 | 说明 |
|------|------|------|
| at_least_once | 默认 | 可能重复处理 |
| exactly_once_v2 | processing.guarantee | 精确一次 |

---
*待补充：更多 Exactly Once 细节*
