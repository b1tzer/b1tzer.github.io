# WebFlux 响应式编程

## 1. 响应式流

```java
// Mono：0-1 个元素
Mono<String> mono = Mono.just("hello");

// Flux：0-N 个元素
Flux<Integer> flux = Flux.range(1, 10);
```

## 2. WebFlux vs Spring MVC

| 特性 | Spring MVC | WebFlux |
|------|-----------|---------|
| 编程模型 | 阻塞式 | 非阻塞式 |
| 线程模型 | 一个请求一个线程 | 事件循环 |
| 适用场景 | 传统 Web | 高并发、流式 |

## 3. RouterFunction

```java
@Configuration
public class RouterConfig {
    @Bean
    public RouterFunction<ServerResponse> routes(UserHandler handler) {
        return RouterFunctions.route()
            .GET("/api/users", handler::listUsers)
            .GET("/api/users/{id}", handler::getUser)
            .POST("/api/users", handler::createUser)
            .build();
    }
}
```

---
*待补充：更多 WebFlux 实战*
