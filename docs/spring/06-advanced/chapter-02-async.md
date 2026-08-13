# 异步处理

## 1. @Async

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    @Bean("taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        return executor;
    }
}

@Service
public class NotificationService {
    @Async("taskExecutor")
    public CompletableFuture<String> sendEmail(String to) {
        // 异步发送邮件
        return CompletableFuture.completedFuture("sent");
    }
}
```

## 2. CompletableFuture

```java
public CompletableFuture<User> getUserAsync(Long id) {
    return CompletableFuture.supplyAsync(() -> userRepository.findById(id))
        .thenApply(user -> enrichUser(user))
        .exceptionally(ex -> getDefaultUser());
}
```

## 3. 异步处理高级用法

### 3.1 异步异常处理

```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {

    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    // 全局异步异常处理器
    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        return (ex, method, params) -> {
            log.error("异步方法 {} 执行异常, 参数: {}", method.getName(), params, ex);
            // 发送告警
            alertService.sendAlert("异步任务失败: " + method.getName(), ex.getMessage());
        };
    }
}
```

### 3.2 CompletableFuture 组合异步操作

```java
@Service
public class AsyncOrderService {

    @Autowired
    private UserClient userClient;
    @Autowired
    private ProductClient productClient;
    @Autowired
    private InventoryClient inventoryClient;

    // 并发调用多个服务，合并结果
    public CompletableFuture<OrderDetail> getOrderDetail(Long orderId) {
        CompletableFuture<User> userFuture = CompletableFuture.supplyAsync(
            () -> userClient.getUser(orderId));

        CompletableFuture<Product> productFuture = CompletableFuture.supplyAsync(
            () -> productClient.getProduct(orderId));

        CompletableFuture<Inventory> inventoryFuture = CompletableFuture.supplyAsync(
            () -> inventoryClient.getInventory(orderId));

        // 等待所有结果
        return CompletableFuture.allOf(userFuture, productFuture, inventoryFuture)
            .thenApply(v -> new OrderDetail(
                userFuture.join(),
                productFuture.join(),
                inventoryFuture.join()
            ));
    }

    // 超时控制
    public CompletableFuture<String> callWithTimeout(Long id) {
        return CompletableFuture.supplyAsync(() -> externalService.call(id))
            .orTimeout(3, TimeUnit.SECONDS)  // Java 9+
            .exceptionally(ex -> "降级结果");
    }
}
```

### 3.3 异步方法的事务问题

```java
@Service
public class OrderService {

    // ❌ 错误：@Async 和 @Transactional 不能在同一方法上使用
    // @Async 方法在独立线程执行，无法加入调用方的事务
    @Async
    @Transactional  // 事务不生效！
    public void processAsync(Long orderId) { /* ... */ }

    // ✅ 正确：拆分为两个方法
    @Transactional
    public void createOrder(OrderRequest request) {
        Order order = orderRepository.save(new Order(request));
        // 事务提交后再异步处理
    }

    @Async
    public void postProcess(Long orderId) {
        // 这里是独立的事务
        Order order = orderRepository.findById(orderId).orElseThrow();
        // 处理后续逻辑
    }
}
```

### 3.4 响应式异步（WebClient）

```java
@Service
public class ReactiveUserService {

    private final WebClient webClient;

    public ReactiveUserService(WebClient.Builder builder) {
        this.webClient = builder.baseUrl("http://user-service").build();
    }

    public Mono<User> getUser(Long id) {
        return webClient.get()
            .uri("/api/users/{id}", id)
            .retrieve()
            .bodyToMono(User.class)
            .timeout(Duration.ofSeconds(3))
            .retryWhen(Retry.backoff(2, Duration.ofMillis(500)))
            .onErrorResume(ex -> Mono.just(User.anonymous()));
    }
}
```

**最佳实践：**

1. **自定义线程池**——不要用默认的 `SimpleAsyncTaskExecutor`（每次创建新线程）
2. **异步方法返回 `CompletableFuture` 或 `void`**——Spring 会自动适配
3. **`@Async` 不要自调用**——和 `@Transactional` 一样，需要通过代理对象调用
4. **异常处理**——`void` 返回值用 `AsyncUncaughtExceptionHandler`，`CompletableFuture` 用 `exceptionally`
