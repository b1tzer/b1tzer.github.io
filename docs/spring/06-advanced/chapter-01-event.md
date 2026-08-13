# 事件机制

## 1. 自定义事件

```java
// 定义事件
public class OrderCreatedEvent extends ApplicationEvent {
    private final Order order;
    
    public OrderCreatedEvent(Object source, Order order) {
        super(source);
        this.order = order;
    }
}

// 发布事件
@Service
public class OrderService {
    @Autowired
    private ApplicationEventPublisher publisher;
    
    public Order createOrder(OrderDTO dto) {
        Order order = /* ... */;
        publisher.publishEvent(new OrderCreatedEvent(this, order));
        return order;
    }
}

// 监听事件
@Component
public class OrderEventListener {
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        // 处理订单创建事件
    }
    
    @Async
    @EventListener
    public void onOrderCreatedAsync(OrderCreatedEvent event) {
        // 异步处理
    }
}
```

## 2. @TransactionalEventListener

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onOrderCreated(OrderCreatedEvent event) {
    // 事务提交后执行
}
```

## 3. 事件机制高级用法

### 3.1 事件继承与泛型监听

```java
// 事件基类
@Getter
public abstract class DomainEvent extends ApplicationEvent {
    private final LocalDateTime occurredAt;
    private final String eventId;

    public DomainEvent(Object source) {
        super(source);
        this.occurredAt = LocalDateTime.now();
        this.eventId = UUID.randomUUID().toString();
    }
}

// 具体事件
@Getter
public class OrderCreatedEvent extends DomainEvent {
    private final Long orderId;
    private final Long userId;
    private final BigDecimal amount;

    public OrderCreatedEvent(Object source, Long orderId, Long userId, BigDecimal amount) {
        super(source);
        this.orderId = orderId;
        this.userId = userId;
        this.amount = amount;
    }
}

@Getter
public class OrderCancelledEvent extends DomainEvent {
    private final Long orderId;
    private final String reason;

    public OrderCancelledEvent(Object source, Long orderId, String reason) {
        super(source);
        this.orderId = orderId;
        this.reason = reason;
    }
}
```

### 3.2 条件监听与事件排序

```java
@Component
@Slf4j
public class OrderEventListener {

    // 条件监听：只处理大额订单
    @EventListener(condition = "#event.amount > 10000")
    public void onLargeOrder(OrderCreatedEvent event) {
        log.info("大额订单告警: orderId={}, amount={}", event.getOrderId(), event.getAmount());
    }

    // 事件排序：先记录日志，再发送通知
    @EventListener
    @Order(1)
    public void auditLog(OrderCreatedEvent event) {
        log.info("订单创建审计: {}", event);
    }

    @EventListener
    @Order(2)
    public void sendNotification(OrderCreatedEvent event) {
        // 发送订单创建通知
    }

    // 异步监听（需要 @EnableAsync）
    @Async
    @EventListener
    public void sendEmailAsync(OrderCreatedEvent event) {
        // 异步发送邮件，不影响主流程
        emailService.sendOrderConfirmation(event.getUserId(), event.getOrderId());
    }
}
```

### 3.3 事务事件监听

```java
@Component
public class TransactionalEventListeners {

    // 事务提交后执行：保证事件只在事务成功时触发
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void afterCommit(OrderCreatedEvent event) {
        // 事务已提交，安全地发送消息到 MQ
        kafkaTemplate.send("order-created", event.getOrderId().toString(), event);
    }

    // 事务回滚后执行
    @TransactionalEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void afterRollback(OrderCreatedEvent event) {
        log.warn("订单创建事务回滚: orderId={}", event.getOrderId());
    }

    // 事务完成后执行（无论提交还是回滚）
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMPLETION)
    public void afterCompletion(OrderCreatedEvent event) {
        // 清理资源
    }

    // 事务前执行（事务尚未提交）
    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void beforeCommit(OrderCreatedEvent event) {
        // 事务提交前的准备工作
    }
}
```

### 3.4 非 Spring 事件：Guava EventBus 对比

```java
// Guava EventBus（轻量级，不依赖 Spring 容器）
EventBus eventBus = new AsyncEventBus(Executors.newFixedThreadPool(4));

// 注册监听器
eventBus.register(new Object() {
    @Subscribe
    public void onOrderCreated(OrderCreatedEvent event) {
        System.out.println("收到事件: " + event);
    }
});

// 发布事件
eventBus.post(new OrderCreatedEvent(this, 1L, 10086L, BigDecimal.valueOf(99.9)));
```

| 特性 | Spring Event | Guava EventBus |
|------|-------------|----------------|
| 事务感知 | ✅ @TransactionalEventListener | ❌ |
| 异步支持 | ✅ @Async | ✅ AsyncEventBus |
| 条件过滤 | ✅ SpEL condition | ❌ |
| 排序 | ✅ @Order | ❌ |
| 错误处理 | 全局 ApplicationEventMulticaster | ErrorHandler |
| 适用场景 | Spring 应用内事件 | 非 Spring 环境、简单解耦 |

**最佳实践：**

1. **事件类用不可变对象**——所有字段 `final`，只有 getter
2. **事务事件用 `AFTER_COMMIT`**——避免事务回滚后发送了不该发的消息
3. **耗时操作用 `@Async`**——邮件、推送等不要阻塞主流程
4. **事件不要传递大数据**——只传 ID，监听器按需查询
