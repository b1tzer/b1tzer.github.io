# 熔断降级

## 1. Resilience4j

```java
@Service
public class UserService {
    @CircuitBreaker(name = "userService", fallbackMethod = "fallback")
    @RateLimiter(name = "userService")
    @Bulkhead(name = "userService")
    public User getUser(Long id) {
        return userClient.getUser(id);
    }
    
    public User fallback(Long id, Throwable t) {
        return new User(0L, "降级用户");
    }
}
```

## 2. 配置

```yaml
resilience4j:
  circuitbreaker:
    instances:
      userService:
        failure-rate-threshold: 50
        wait-duration-in-open-state: 5000
        sliding-window-size: 10
  ratelimiter:
    instances:
      userService:
        limit-for-period: 10
        limit-refresh-period: 1s
```

---
*待补充：更多熔断策略*
