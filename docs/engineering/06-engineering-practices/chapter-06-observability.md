# 可观测性

> **核心问题**：日志、指标、链路追踪三大支柱如何落地？如何快速定位线上问题？

---

## 1. 可观测性三大支柱

| 支柱 | 回答的问题 | 工具 |
|------|-----------|------|
| 日志（Logging） | 发生了什么？ | ELK、Loki |
| 指标（Metrics） | 系统状态如何？ | Prometheus、Grafana |
| 链路追踪（Tracing） | 请求经过了哪些服务？ | SkyWalking、Jaeger |

## 2. 结构化日志

```java
// 使用 SLF4J + Logback 结构化日志
@Slf4j
@Service
public class OrderService {
    
    public Long createOrder(CreateOrderCommand cmd) {
        // 使用 MDC 记录请求上下文
        MDC.put("userId", String.valueOf(cmd.getUserId()));
        MDC.put("traceId", Tracer.currentSpan().context().traceId());
        
        try {
            log.info("开始创建订单, amount={}", cmd.getAmount());
            
            Order order = new Order(cmd.getUserId(), cmd.getAmount());
            orderRepository.save(order);
            
            log.info("订单创建成功, orderId={}", order.getId());
            return order.getId();
            
        } catch (Exception e) {
            log.error("订单创建失败, userId={}, amount={}", 
                cmd.getUserId(), cmd.getAmount(), e);
            throw e;
        } finally {
            MDC.clear();
        }
    }
}

// 日志格式（JSON 格式，便于 ELK 解析）
// {"timestamp":"2024-01-15T10:30:00Z","level":"INFO","logger":"OrderService",
//  "message":"订单创建成功","orderId":12345,"userId":100,"traceId":"abc123"}
```

## 3. 指标监控

```java
// Spring Boot Actuator + Micrometer 指标暴露
// application.yml
// management:
//   endpoints:
//     web:
//       exposure:
//         include: health,metrics,prometheus
//   metrics:
//     tags:
//       application: order-service

// 自定义业务指标
@Component
public class OrderMetrics {
    private final Counter orderCounter;
    private final Timer orderTimer;
    private final Gauge orderGauge;
    
    public OrderMetrics(MeterRegistry registry) {
        this.orderCounter = Counter.builder("orders.created")
            .description("创建的订单数")
            .register(registry);
        
        this.orderTimer = Timer.builder("orders.processing.time")
            .description("订单处理耗时")
            .register(registry);
    }
    
    public void recordOrderCreated() {
        orderCounter.increment();
    }
    
    public <T> T recordProcessingTime(Supplier<T> supplier) {
        return orderTimer.record(supplier);
    }
}

// Grafana 告警规则示例
// - alert: HighErrorRate
//   expr: rate(http_server_requests_seconds_count{status=~"5.."}[5m]) / rate(http_server_requests_seconds_count[5m]) > 0.05
//   for: 5m
//   labels:
//     severity: critical
//   annotations:
//     summary: "错误率超过 5%"
```

## 4. 链路追踪

```java
// SkyWalking 自动注入，无需代码修改
// 通过 Java Agent 启动：
// java -javaagent:skywalking-agent.jar -jar app.jar

// 自定义 Span
@GetMapping("/orders/{id}")
public OrderVO getOrder(@PathVariable Long id) {
    // SkyWalking 自动创建 Span
    // 可以手动添加标签
    Span span = ContextManager.createLocalSpan("processOrder");
    try {
        span.tag("orderId", String.valueOf(id));
        Order order = orderRepository.findById(id);
        return OrderMapper.toVO(order);
    } finally {
        ContextManager.stopSpan();
    }
}

// 链路追踪的价值：
// 1. 快速定位慢请求（哪个服务、哪个方法耗时最长）
// 2. 发现服务间调用关系（调用拓扑图）
// 3. 分析错误传播路径（错误从哪个服务开始）
// 4. 容量规划（每个服务的 QPS 和延迟分布）
```

## 5. 监控体系设计

| 层次 | 监控内容 | 告警阈值 |
|------|---------|---------|
| 基础设施 | CPU、内存、磁盘、网络 | CPU > 80%、内存 > 90% |
| 应用层 | QPS、响应时间、错误率 | 错误率 > 5%、P99 > 1s |
| 业务层 | 订单量、支付成功率 | 支付成功率 < 95% |

> **核心原则**：可观测性不是事后补充，而是从第一天就设计进去。日志告诉你"发生了什么"，指标告诉你"系统状态如何"，链路追踪告诉你"问题在哪里"。三者缺一不可。
