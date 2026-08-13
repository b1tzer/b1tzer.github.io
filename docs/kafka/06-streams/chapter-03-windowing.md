# 窗口操作

## 1. 翻转窗口

```java
KTable<Windowed<String>, Long> counts = stream
    .groupBy((key, value) -> value)
    .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))
    .count();
```

## 2. 跳跃窗口

```java
KTable<Windowed<String>, Long> counts = stream
    .groupBy((key, value) -> value)
    .windowedBy(TimeWindows.of(Duration.ofMinutes(5)).advanceBy(Duration.ofMinutes(1)))
    .count();
```

## 3. 会话窗口

```java
KTable<Windowed<String>, Long> counts = stream
    .groupBy((key, value) -> value)
    .windowedBy(SessionWindows.with(Duration.ofMinutes(30)))
    .count();
```

## 4. 滑动窗口

```java
// 用于连接操作
JoinWindows.of(Duration.ofMinutes(5))
```

---
*待补充：更多窗口细节*
