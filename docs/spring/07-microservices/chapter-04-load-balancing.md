# 负载均衡

## 1. OpenFeign

```java
@FeignClient(name = "user-service", fallbackFactory = UserClientFallback.class)
public interface UserClient {
    @GetMapping("/api/users/{id}")
    User getUser(@PathVariable Long id);
}

@Component
public class UserClientFallback implements FallbackFactory<UserClient> {
    @Override
    public UserClient create(Throwable cause) {
        return id -> new User(0L, "默认用户");
    }
}
```

## 2. 负载均衡策略

| 策略 | 说明 |
|------|------|
| RoundRobin | 轮询（默认） |
| Random | 随机 |
| WeightedResponseTime | 响应时间权重 |
| BestAvailable | 最小并发 |

---
*待补充：更多负载均衡配置*
