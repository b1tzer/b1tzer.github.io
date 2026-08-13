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

## 3. 负载均衡高级配置

### 3.1 自定义负载均衡策略

```java
// 自定义轮询策略
public class CustomLoadBalancer implements ReactorServiceInstanceLoadBalancer {

    private final AtomicInteger position = new AtomicInteger(0);
    private final String serviceId;
    private final ObjectProvider<ServiceInstanceListSupplier> supplierProvider;

    public CustomLoadBalancer(ObjectProvider<ServiceInstanceListSupplier> supplierProvider,
            String serviceId) {
        this.supplierProvider = supplierProvider;
        this.serviceId = serviceId;
    }

    @Override
    public Mono<Response<ServiceInstance>> choose(Request request) {
        ServiceInstanceListSupplier supplier = supplierProvider.getIfAvailable();
        return supplier.get()
            .next()
            .map(this::getInstanceResponse);
    }

    private Response<ServiceInstance> getInstanceResponse(List<ServiceInstance> instances) {
        if (instances.isEmpty()) {
            return new EmptyResponse();
        }
        // 加权轮询
        int pos = position.incrementAndGet() % instances.size();
        return new DefaultResponse(instances.get(pos));
    }
}

// 注册自定义负载均衡
@Configuration
public class LoadBalancerConfig {

    @Bean
    public ReactorLoadBalancer<ServiceInstance> customLoadBalancer(
            Environment environment,
            LoadBalancerClientFactory loadBalancerClientFactory) {
        String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
        return new CustomLoadBalancer(
            loadBalancerClientFactory.getLazyProvider(name, ServiceInstanceListSupplier.class),
            name);
    }
}
```

### 3.2 指定服务的负载均衡策略

```java
// 针对特定服务配置不同的负载均衡策略
@FeignClient(name = "payment-service", configuration = PaymentFeignConfig.class)
public interface PaymentClient {
    @PostMapping("/api/payment/create")
    PaymentResult createPayment(PaymentRequest request);
}

// PaymentFeignConfig.java
public class PaymentFeignConfig {

    @Bean
    public ReactorLoadBalancer<ServiceInstance> paymentLoadBalancer(
            Environment environment,
            LoadBalancerClientFactory factory) {
        String name = environment.getProperty(LoadBalancerClientFactory.PROPERTY_NAME);
        // 支付服务用加权响应时间策略
        return new WeightedResponseTimeLoadBalancer(
            factory.getLazyProvider(name, ServiceInstanceListSupplier.class), name);
    }
}
```

### 3.3 OpenFeign 高级配置

```java
@FeignClient(
    name = "user-service",
    configuration = UserFeignConfig.class,
    fallbackFactory = UserClientFallbackFactory.class
)
public interface UserClient {

    @GetMapping("/api/users/{id}")
    User getUser(@PathVariable("id") Long id);

    @PostMapping("/api/users")
    User createUser(@RequestBody User user);

    // 复杂查询参数
    @GetMapping("/api/users")
    Page<User> searchUsers(
        @RequestParam("keyword") String keyword,
        @RequestParam(value = "page", defaultValue = "1") int page,
        @RequestParam(value = "size", defaultValue = "20") int size);

    // 文件上传
    @PostMapping(value = "/api/users/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    String uploadAvatar(@RequestPart("file") MultipartFile file);
}

// Feign 配置类
public class UserFeignConfig {

    @Bean
    public Request.Options requestOptions() {
        return new Request.Options(
            2, TimeUnit.SECONDS,   // 连接超时
            5, TimeUnit.SECONDS,   // 读取超时
            true
        );
    }

    @Bean
    public ErrorDecoder errorDecoder() {
        return (methodKey, response) -> {
            if (response.status() == 404) {
                return new UserNotFoundException("用户不存在");
            }
            return new RuntimeException("调用 user-service 失败: " + response.status());
        };
    }
}
```

**最佳实践：**

1. **默认轮询足够**——大多数场景 Round Robin 就够了
2. **同机房优先**——配置 `zone-preference` 避免跨机房调用
3. **Feign 超时要小于网关超时**——避免网关已超时但 Feign 还在等待
4. **降级必须有**——任何远程调用都可能失败，降级方案是保底
5. **连接池复用**——配置 `OkHttp` 或 `Apache HttpClient` 替代默认的 `HttpURLConnection`
