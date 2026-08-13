# API 网关

## 1. Spring Cloud Gateway

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=1
```

## 2. 自定义过滤器

```java
@Component
public class AuthFilter implements GlobalFilter, Ordered {
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String token = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (!validateToken(token)) {
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
        return chain.filter(exchange);
    }
    
    @Override
    public int getOrder() { return -1; }
}
```

## 3. 网关高级配置

### 3.1 全局过滤器链

```java
@Component
public class LoggingGlobalFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(LoggingGlobalFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        long startTime = System.currentTimeMillis();
        String path = exchange.getRequest().getPath().value();
        String method = exchange.getRequest().getMethod().name();

        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            long duration = System.currentTimeMillis() - startTime;
            int statusCode = exchange.getResponse().getStatusCode() != null
                ? exchange.getResponse().getStatusCode().value() : 0;

            if (duration > 1000) {
                log.warn("慢请求: {} {} 耗时 {}ms 状态码 {}", method, path, duration, statusCode);
            } else {
                log.info("请求: {} {} 耗时 {}ms 状态码 {}", method, path, duration, statusCode);
            }
        }));
    }

    @Override
    public int getOrder() {
        return -200;  // 最先执行
    }
}
```

### 3.2 路由断言工厂

```yaml
spring:
  cloud:
    gateway:
      routes:
        # 基于 Header 的路由
        - id: beta-route
          uri: lb://user-service-beta
          predicates:
            - Header=X-User-Type, beta
            - Path=/api/users/**
          filters:
            - StripPrefix=1

        # 基于 Cookie 的路由
        - id: vip-route
          uri: lb://user-service-vip
          predicates:
            - Cookie=userType, vip
            - Path=/api/users/**
          filters:
            - StripPrefix=1

        # 基于时间的路由（维护窗口）
        - id: maintenance-route
          uri: lb://maintenance-service
          predicates:
            - Between=2024-01-15T02:00:00+08:00,2024-01-15T04:00:00+08:00
```

### 3.3 限流配置

```java
@Configuration
public class RateLimiterConfig {

    @Bean
    public KeyResolver userKeyResolver() {
        // 按用户 ID 限流
        return exchange -> Mono.just(
            exchange.getRequest().getHeaders()
                .getFirst("X-User-Id"));
    }

    @Bean
    public KeyResolver ipKeyResolver() {
        // 按 IP 限流
        return exchange -> Mono.just(
            Objects.requireNonNull(
                exchange.getRequest().getRemoteAddress())
                .getAddress().getHostAddress());
    }
}
```

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=1
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10  # 每秒放 10 个请求
                redis-rate-limiter.burstCapacity: 20   # 突发最多 20 个
                key-resolver: "#{@ipKeyResolver}"     # 按 IP 限流
```

### 3.4 熔断集成（Resilience4j）

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
          filters:
            - StripPrefix=1
            - name: CircuitBreaker
              args:
                name: orderServiceCB
                fallbackUri: forward:/fallback/order
                statusCodes:
                  - 500
                  - 503

resilience4j:
  circuitbreaker:
    instances:
      orderServiceCB:
        failure-rate-threshold: 50
        wait-duration-in-open-state: 5s
        sliding-window-size: 10
```

**最佳实践：**

1. **网关是无状态的**——不要在网关中存储会话信息
2. **限流按业务维度**——API 级、用户级、IP 级多层限流
3. **网关超时 < 服务超时**——确保网关先超时返回，避免线程堆积
4. **灰度发布**——通过 Header 路由实现金丝雀发布
5. **网关也要监控**——记录每个路由的 QPS、错误率、延迟
