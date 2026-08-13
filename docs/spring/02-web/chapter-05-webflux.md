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

## 4. WebFlux 实战

### 4.1 函数式端点（RouterFunction）

```java
@Configuration
public class UserRouter {

    @Bean
    public RouterFunction<ServerResponse> userRoutes(UserHandler handler) {
        return RouterFunctions.route()
            .GET("/api/users", handler::listUsers)
            .GET("/api/users/{id}", handler::getUser)
            .POST("/api/users", handler::createUser)
            .PUT("/api/users/{id}", handler::updateUser)
            .DELETE("/api/users/{id}", handler::deleteUser)
            .build();
    }
}

@Component
public class UserHandler {

    private final UserRepository userRepository;

    public UserHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Mono<ServerResponse> listUsers(ServerRequest request) {
        Flux<User> users = userRepository.findAll();
        return ServerResponse.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .body(users, User.class);
    }

    public Mono<ServerResponse> getUser(ServerRequest request) {
        Long id = Long.valueOf(request.pathVariable("id"));
        return userRepository.findById(id)
            .flatMap(user -> ServerResponse.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(user))
            .switchIfEmpty(ServerResponse.notFound().build());
    }

    public Mono<ServerResponse> createUser(ServerRequest request) {
        return request.bodyToMono(User.class)
            .flatMap(userRepository::save)
            .flatMap(user -> ServerResponse
                .created(URI.create("/api/users/" + user.getId()))
                .bodyValue(user));
    }
}
```

### 4.2 响应式 Repository

```java
// Spring Data Reactive MongoDB
public interface UserRepository extends ReactiveMongoRepository<User, String> {
    Flux<User> findByAgeBetween(int min, int max);
    Mono<User> findByEmail(String email);
}

// Spring Data R2DBC（响应式关系数据库）
public interface UserRepository extends R2dbcRepository<User, Long> {
    @Query("SELECT * FROM users WHERE status = :status")
    Flux<User> findByStatus(@Param("status") String status);
}
```

### 4.3 Mono/Flux 核心操作

```java
@Service
public class ReactiveUserService {

    private final UserRepository userRepository;
    private final WebClient webClient;

    public ReactiveUserService(UserRepository userRepository, WebClient.Builder builder) {
        this.userRepository = userRepository;
        this.webClient = builder.baseUrl("http://order-service").build();
    }

    // 转换：map
    public Flux<UserDTO> getAllUserDTOs() {
        return userRepository.findAll()
            .map(user -> new UserDTO(user.getId(), user.getName()));
    }

    // 异步转换：flatMap
    public Mono<UserDetail> getUserDetail(Long id) {
        return userRepository.findById(id)
            .flatMap(user -> webClient.get()
                .uri("/api/orders?userId={id}", id)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<Order>>() {})
                .map(orders -> new UserDetail(user, orders)));
    }

    // 过滤
    public Flux<User> getActiveUsers() {
        return userRepository.findAll()
            .filter(user -> "ACTIVE".equals(user.getStatus()));
    }

    // 合并多个流
    public Flux<Object> getUserActivity(Long userId) {
        Flux<Order> orders = getOrders(userId);
        Flux<LoginLog> loginLogs = getLoginLogs(userId);
        return Flux.merge(orders, loginLogs)
            .sort(Comparator.comparing(Activity::getCreatedAt).reversed());
    }

    // 错误处理
    public Mono<User> safeGetUser(Long id) {
        return userRepository.findById(id)
            .switchIfEmpty(Mono.error(new UserNotFoundException(id)))
            .onErrorResume(ex -> Mono.just(User.anonymous()))
            .timeout(Duration.ofSeconds(3))
            .retry(2);
    }
}
```

### 4.4 WebFlux 中的全局异常处理

```java
@RestControllerAdvice
public class GlobalWebExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public Mono<ResponseEntity<ErrorResponse>> handleNotFound(UserNotFoundException ex) {
        return Mono.just(ResponseEntity.status(404)
            .body(new ErrorResponse("USER_NOT_FOUND", ex.getMessage())));
    }
}

// 或者实现 WebExceptionHandler
@Component
@Order(-1)
public class CustomWebExceptionHandler implements WebExceptionHandler {

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();
        if (response.isCommitted()) {
            return Mono.error(ex);
        }

        response.setStatusCode(HttpStatus.INTERNAL_SERVER_ERROR);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = "{\"code\":500,\"message\":\"" + ex.getMessage() + "\"}";
        DataBuffer buffer = response.bufferFactory().wrap(body.getBytes());
        return response.writeWith(Mono.just(buffer));
    }
}
```

**WebFlux vs MVC 选择指南：**

| 场景 | 选择 | 理由 |
|------|------|------|
| 传统 CRUD 应用 | Spring MVC | 生态成熟，学习成本低 |
| 高并发网关 | WebFlux | 非阻塞，少量线程处理大量连接 |
| 流式数据处理 | WebFlux | Flux 天然支持流式处理 |
| 调用多个下游服务 | WebFlux | 并发调用无需线程池 |
| 团队不熟悉响应式 | Spring MVC | 强行用 WebFlux 反而增加 Bug |

**最佳实践：**

1. **WebFlux 中不要调用阻塞 API**——会导致事件循环线程被阻塞，整个系统瘫痪
2. **阻塞操作用 `Mono.fromCallable()` + `subscribeOn(Schedulers.boundedElastic())`** 隔离
3. **错误处理用 `onErrorResume` / `onErrorReturn`** 而非 try-catch
4. **调试困难时使用 `log()` 操作符**追踪数据流
