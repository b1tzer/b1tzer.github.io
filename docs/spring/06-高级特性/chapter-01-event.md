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

---
*待补充：更多事件场景*
