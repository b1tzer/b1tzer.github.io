# 流操作

## 1. 过滤

```java
KStream<String, String> filtered = stream.filter((key, value) -> value.length() > 5);
```

## 2. 映射

```java
KStream<String, Integer> mapped = stream.mapValues(value -> value.length());
```

## 3. 聚合

```java
KTable<String, Long> counts = stream
    .groupBy((key, value) -> value)
    .count();
```

## 4. 连接

```java
// KStream-KStream 连接
KStream<String, String> joined = stream1.join(
    stream2,
    (value1, value2) -> value1 + "-" + value2,
    JoinWindows.of(Duration.ofMinutes(5))
);

// KStream-KTable 连接
KStream<String, String> joined = stream.join(
    table,
    (streamValue, tableValue) -> streamValue + "-" + tableValue
);
```

---
*待补充：更多流操作细节*
