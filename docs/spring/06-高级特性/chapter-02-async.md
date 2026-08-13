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

---
*待补充：更多异步场景*
