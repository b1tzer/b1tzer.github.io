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

## 3. Resilience4j 高级配置

### 3.1 熔断器详解

```java
@Service
public class UserService {

    // 熔断 + 限流 + 隔离
    @CircuitBreaker(name = "userService", fallbackMethod = "getUserFallback")
    @RateLimiter(name = "userService")
    @Bulkhead(name = "userService")
    @TimeLimiter(name = "userService")
    public CompletableFuture<User> getUser(Long id) {
        return CompletableFuture.supplyAsync(() -> userClient.getUser(id));
    }

    // 降级方法：参数必须与原方法一致，最后加 Throwable
    private CompletableFuture<User> getUserFallback(Long id, Throwable t) {
        if (t instanceof CallNotPermittedException) {
            return CompletableFuture.completedFuture(new User(id, "服务熔断中", ""));
        } else if (t instanceof BulkheadFullException) {
            return CompletableFuture.completedFuture(new User(id, "服务繁忙", ""));
        }
        return CompletableFuture.completedFuture(new User(id, "降级用户", ""));
    }
}
```

```yaml
resilience4j:
  circuitbreaker:
    instances:
      userService:
        register-health-indicator: true
        failure-rate-threshold: 50           # 失败率 50% 触发熔断
        slow-call-rate-threshold: 80         # 慢调用率 80% 触发熔断
        slow-call-duration-threshold: 2s     # 超过 2s 算慢调用
        sliding-window-size: 10              # 统计窗口大小
        sliding-window-type: COUNT_BASED     # 基于调用次数
        minimum-number-of-calls: 5           # 最少 5 次调用才统计
        wait-duration-in-open-state: 10s     # 熔断持续 10 秒
        permitted-number-of-calls-in-half-open-state: 3  # 半开状态允许 3 次探测
        automatic-transition-from-open-to-half-open-enabled: true

  ratelimiter:
    instances:
      userService:
        limit-for-period: 10           # 每秒 10 个请求
        limit-refresh-period: 1s
        timeout-duration: 500ms        # 等待超时时间

  bulkhead:
    instances:
      userService:
        max-concurrent-calls: 25       # 最大并发数
        max-wait-duration: 500ms       # 等待超时

  timelimiter:
    instances:
      userService:
        timeout-duration: 3s           # 超时时间
        cancel-running-future: true    # 超时后取消正在执行的任务
```

### 3.2 重试配置

```java
@Service
public class ProductService {

    @Retry(name = "productService", fallbackMethod = "getProductFallback")
    public Product getProduct(Long id) {
        return productClient.getProduct(id);
    }

    private Product getProductFallback(Long id, Throwable t) {
        log.warn("商品服务降级, id={}", id, t);
        return new Product(id, "商品信息暂不可用", BigDecimal.ZERO);
    }
}
```

```yaml
resilience4j:
  retry:
    instances:
      productService:
        max-attempts: 3
        wait-duration: 500ms
        exponential-backoff-multiplier: 2
        retry-exceptions:
          - java.io.IOException
          - java.net.SocketTimeoutException
        ignore-exceptions:
          - com.example.BusinessException  # 业务异常不重试
```

### 3.3 熔断器状态监控

```java
@Component
public class CircuitBreakerMonitor {

    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;

    @Scheduled(fixedRate = 30000)
    public void monitor() {
        circuitBreakerRegistry.getAllCircuitBreakers().forEach(cb -> {
            CircuitBreaker.Metrics metrics = cb.getMetrics();
            log.info("熔断器 [{}] 状态={}, 失败率={}%, 慢调用率={}%, " +
                "调用次数={}, 失败次数={}, 不允许调用次数={}",
                cb.getName(), cb.getState(),
                metrics.getFailureRate(),
                metrics.getSlowCallRate(),
                metrics.getNumberOfTotalCalls(),
                metrics.getNumberOfFailedCalls(),
                metrics.getNumberOfNotPermittedCalls());
        });
    }
}
```

### 3.4 Resilience4j vs Sentinel 对比

| 特性 | Resilience4j | Sentinel |
|------|-------------|----------|
| 实现方式 | 装饰器模式，函数式 | 滑动窗口统计 |
| 隔离 | 信号量 + 线程池 | 信号量 |
| 流控效果 | 简单限流 | 预热、排队、关联 |
| 热点参数 | ❌ | ✅ |
| 管控台 | 无独立控制台 | ✅ Dashboard |
| 适用场景 | 函数式、轻量级 | 大规模流控治理 |

**最佳实践：**

1. **熔断器必须有降级**——熔断后返回兜底数据，而不是抛异常
2. **重试只对幂等操作**——创建订单等非幂等操作不能重试
3. **隔离策略选择**——CPU 密集用信号量隔离，IO 密集用线程池隔离
4. **熔断阈值要根据业务调整**——不能所有服务用同一个阈值
5. **监控是必须的**——熔断器状态、调用次数、失败率都要有监控
