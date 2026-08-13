# 高并发设计

## 1. 缓存

```java
// 多级缓存
L1: 本地缓存 (Caffeine)
L2: 分布式缓存 (Redis)
L3: 数据库
```

## 2. 异步

```java
// 消息队列异步处理
producer.send(orderEvent);
// 消费者异步处理
consumer.listen(orderEvent -> processOrder(event));
```

## 3. 限流

```java
// 令牌桶算法
RateLimiter limiter = RateLimiter.create(100); // 100 QPS
if (limiter.tryAcquire()) {
    // 处理请求
}
```

## 4. 熔断

```java
@CircuitBreaker(name = "userService", fallbackMethod = "fallback")
public User getUser(Long id) { /* ... */ }
```

## 5. 降级

```java
// 返回默认值或缓存数据
public User fallback(Long id, Throwable t) {
    return new User(0L, "默认用户");
}
```

---
*待补充：更多高并发设计*
