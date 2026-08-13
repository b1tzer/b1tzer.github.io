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

## 6. 缓存策略详解

### 6.1 多级缓存实现

```java
// Caffeine 本地缓存 + Redis 分布式缓存
@Service
public class MultiLevelCacheService {
    private final Cache<Long, User> localCache = Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterWrite(Duration.ofMinutes(5))
        .build();
    
    private final StringRedisTemplate redisTemplate;
    private final UserRepository userRepository;
    
    public User getUser(Long userId) {
        // L1: 本地缓存
        User user = localCache.getIfPresent(userId);
        if (user != null) return user;
        
        // L2: Redis 缓存
        String json = redisTemplate.opsForValue().get("user:" + userId);
        if (json != null) {
            user = deserialize(json);
            localCache.put(userId, user);
            return user;
        }
        
        // L3: 数据库
        user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            redisTemplate.opsForValue().set("user:" + userId, serialize(user), Duration.ofMinutes(30));
            localCache.put(userId, user);
        }
        return user;
    }
}
```

### 6.2 缓存穿透、击穿、雪崩

```java
// 缓存穿透：查询不存在的数据，每次都打到 DB
// 解决：缓存空值 + 布隆过滤器
public User getUserSafe(Long userId) {
    String cached = redisTemplate.opsForValue().get("user:" + userId);
    if ("NULL".equals(cached)) return null;  // 空值缓存
    if (cached != null) return deserialize(cached);
    
    User user = userRepository.findById(userId).orElse(null);
    if (user == null) {
        redisTemplate.opsForValue().set("user:" + userId, "NULL", Duration.ofMinutes(2));
    } else {
        redisTemplate.opsForValue().set("user:" + userId, serialize(user), Duration.ofMinutes(30));
    }
    return user;
}

// 缓存击穿：热点 key 过期，大量请求同时打到 DB
// 解决：分布式锁
public User getUserWithLock(Long userId) {
    String cached = redisTemplate.opsForValue().get("user:" + userId);
    if (cached != null) return deserialize(cached);
    
    String lockKey = "lock:user:" + userId;
    boolean locked = Boolean.TRUE.equals(
        redisTemplate.opsForValue().setIfAbsent(lockKey, "1", Duration.ofSeconds(10)));
    try {
        if (locked) {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                redisTemplate.opsForValue().set("user:" + userId, serialize(user), Duration.ofMinutes(30));
            }
            return user;
        } else {
            Thread.sleep(50);
            return getUserWithLock(userId);
        }
    } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return null;
    } finally {
        if (locked) redisTemplate.delete(lockKey);
    }
}
```

## 7. 消息队列异步处理

```java
// 异步处理：下单 -> 返回成功 + MQ 消息 -> 异步处理后续
@Service
public class AsyncOrderService {
    private final RocketMQTemplate mq;
    
    @Transactional
    public Long createOrder(CreateOrderCommand cmd) {
        Order order = new Order(cmd.getUserId(), cmd.getAmount());
        orderRepository.save(order);
        mq.convertAndSend("order-created", new OrderCreatedEvent(order.getId()));
        return order.getId();  // 快速返回
    }
}
```

## 8. 滑动窗口限流

```java
class SlidingWindowRateLimiter {
    private final int maxRequests;
    private final long windowMillis;
    private final TreeMap<Long, Integer> requests = new TreeMap<>();
    
    SlidingWindowRateLimiter(int maxRequests, long windowSeconds) {
        this.maxRequests = maxRequests;
        this.windowMillis = windowSeconds * 1000;
    }
    
    public synchronized boolean tryAcquire() {
        long now = System.currentTimeMillis();
        long windowStart = now - windowMillis;
        requests.headMap(windowStart).clear();
        int count = requests.values().stream().mapToInt(Integer::intValue).sum();
        if (count < maxRequests) {
            requests.merge(now, 1, Integer::sum);
            return true;
        }
        return false;
    }
}
```

> **核心原则**：高并发设计的本质是“分流”——用缓存分流数据库读压力，用异步分流同步处理链路，用限流分流突发流量，用熔断分流异常请求。
