# 第 7 章 消息驱动架构

> 用户下单后要扣库存、发短信、记日志、通知仓库。同步调用四个服务，每个 100ms，总共 400ms。任何一个超时，整个下单就卡住。如果把短信、日志、仓库通知改成异步消息，主链路只留扣库存，响应时间直接砍到 120ms。消息驱动架构解决的就是这个问题：**如何用异步消息把同步链路拆开，让系统在高并发下保持可用和弹性？**

## 7.1 同步链路的局限

### 7.1.1 一条典型的同步调用链

以电商下单为例，用户的 `POST /orders` 请求在同步模型中可能经历如下链路：

```text
客户端 → API Gateway → 订单服务 → 库存服务 → 支付服务 → 通知服务 → 返回
         ~5ms          ~20ms      ~30ms      ~50ms      ~100ms
```

整条链路的响应时间是各环节之和（约 205ms），且任何一个环节超时或宕机都会导致整体失败。

### 7.1.2 同步链路的三大痛点

| 痛点 | 表现 | 后果 |
|------|------|------|
| **级联阻塞** | 下游服务 RT 飙升时，上游线程被阻塞 | 线程池耗尽，雪崩效应 |
| **强耦合** | 服务间直接依赖，一个宕机全部不可用 | 可用性等于最弱一环 |
| **无法削峰** | 流量洪峰直接打到下游 | 数据库连接池耗尽、超时 |

### 7.1.3 同步链路的数学分析

假设每个服务的可用性是 99.9%（三个 9），一条同步链路串联 5 个服务：

```text
整体可用性 = 99.9% × 99.9% × 99.9% × 99.9% × 99.9%
           = 99.9%^5
           ≈ 99.5%
           = 每 200 个请求就有 1 个失败
```

如果用消息异步解耦，每个环节独立：

```text
任一环节失败 → 消息进入重试队列 → 稍后重试
整体可用性取决于最核心的一环（如数据库），而非全链路
```

这就是为什么高可用架构倾向于异步解耦——**它将乘法关系变成了独立概率**。

### 7.1.4 从同步到异步的思维转变

同步调用是"打电话"——你必须等对方说完才能继续；异步消息是"发短信"——你发出去就可以做别的事，对方有空再处理。

```java
// 同步：阻塞等待结果
Order order = orderService.create(request);
inventoryService.deduct(order);      // 阻塞
paymentService.charge(order);        // 阻塞
notificationService.send(order);     // 阻塞

// 异步：发布事件后立即返回
Order order = orderService.create(request);
eventPublisher.publish(new OrderCreatedEvent(order.getId()));
return order;  // 立即响应客户端
```

异步化后，`库存扣减`、`支付处理`、`通知发送` 变成独立的消费者，各自消费同一事件，互不阻塞。

### 7.1.5 异步化的代价

异步不是银弹，它引入了新的复杂度：

| 代价 | 说明 | 应对策略 |
|------|------|----------|
| **最终一致性** | 数据不实时一致，存在短暂不一致窗口 | 业务上可接受 + 状态机补偿 |
| **调试困难** | 调用链路断裂，出错难追踪 | 分布式追踪（TraceId 贯穿全链路）|
| **消息丢失风险** | MQ 宕机可能丢消息 | 本地事务表 + ACK 机制 |
| **重复消费** | 网络抖动导致消息重复投递 | 幂等设计（eventId 去重）|
| **顺序性** | 多分区/多消费者难以保证全局有序 | 按业务键分区，局部有序 |

**原则：只对非关键路径做异步化。** 支付扣款必须同步返回结果；支付成功后的通知、积分、报表可以异步。

---

## 7.2 事件驱动设计

### 7.2.1 命令 vs 事件

| 维度 | 命令（Command） | 事件（Event） |
|------|-----------------|---------------|
| 语义 | "请做某事" | "某事发生了" |
| 方向 | 指向特定接收者 | 广播给所有订阅者 |
| 耦合 | 发送者知道接收者 | 发送者不知道谁会消费 |
| 失败 | 可以拒绝执行 | 已经发生，不可撤回 |
| 示例 | `CreateOrderCommand` | `OrderCreatedEvent` |

事件驱动的核心思想：**生产者只负责发布"发生了什么"，不关心谁来处理、怎么处理。**

### 7.2.2 事件驱动的架构模式

```text
┌─────────────┐     Event Bus      ┌──────────────────┐
│  订单服务    │ ──OrderCreated──→  │  库存消费者       │
│  (Producer)  │                    │  支付消费者       │
│              │                    │  通知消费者       │
│              │                    │  搜索索引消费者    │
└─────────────┘                    └──────────────────┘
```

消费者可以独立扩缩容：大促时库存消费者扩 10 个实例，通知消费者扩 3 个实例，互不影响。

### 7.2.3 事件风暴建模

在设计阶段，团队可以用"事件风暴"（Event Storming）方法梳理业务：

1. **识别领域事件**：橙色便签纸写事件（`OrderCreated`、`PaymentCompleted`）
2. **识别命令**：蓝色便签纸写触发事件的命令（`PlaceOrder`）
3. **识别聚合根**：黄色便签纸写处理命令的实体（`Order`）
4. **识别策略**：紫色便签纸写响应事件的自动化流程

```text
[PlaceOrder] → (Order) → [OrderCreated] → 策略: 扣减库存
                                          → 策略: 创建支付单
                                          → 策略: 发送通知
```

### 7.2.4 事件溯源（Event Sourcing）

事件溯源是一种更极端的事件驱动模式：**不存储当前状态，只存储状态变更的事件序列。**

```text
传统模式：
  数据库记录：{ orderId: 1, status: 'PAID', amount: 100 }
  → 每次状态变更直接 UPDATE

事件溯源：
  Event 1: OrderCreated { orderId: 1, amount: 100 }
  Event 2: OrderPaid    { orderId: 1, paidAt: '...' }
  Event 3: OrderShipped { orderId: 1, trackingNo: '...' }
  → 当前状态通过重放所有事件得出
```

```java
// 事件溯源的核心：聚合根从事件中重建
public class OrderAggregate {
    private String orderId;
    private OrderStatus status;
    private BigDecimal amount;
    private List<DomainEvent> uncommittedEvents = new ArrayList<>();

    // 从历史事件重建
    public static OrderAggregate rehydrate(List<DomainEvent> history) {
        OrderAggregate order = new OrderAggregate();
        history.forEach(order::apply);
        return order;
    }

    // 命令处理：产生事件
    public void pay(String paymentId) {
        if (this.status != OrderStatus.CREATED) {
            throw new IllegalStateException("只有待支付订单可以付款");
        }
        apply(new OrderPaidEvent(this.orderId, paymentId, Instant.now()));
    }

    // 事件应用：变更状态
    private void apply(OrderPaidEvent event) {
        this.status = OrderStatus.PAID;
        this.uncommittedEvents.add(event);
    }
}
```

事件溯源的优势：完整的审计日志、可回溯任意时间点的状态、天然支持事件驱动。代价是查询复杂（需要物化视图）和事件版本迁移的挑战。

### 7.2.5 CQRS：命令查询分离

CQRS（Command Query Responsibility Segregation）将写模型和读模型分开：

```text
写侧（Command）          读侧（Query）
┌──────────────┐        ┌──────────────┐
│  命令处理器   │        │  查询处理器   │
│  领域模型     │  事件   │  物化视图     │
│  (规范化)     │ ────→  │  (反规范化)   │
└──────────────┘        └──────────────┘
     写库                    读库
  (PostgreSQL)            (Elasticsearch)
```

```java
// 写侧：复杂的业务逻辑
@Service
public class OrderCommandService {
    public void placeOrder(PlaceOrderCommand cmd) {
        Order order = Order.create(cmd);
        orderRepository.save(order);
        eventPublisher.publish(new OrderCreatedEvent(order));
    }
}

// 读侧：简单的查询，面向特定场景优化
@Service
public class OrderQueryService {
    // 用 Elasticsearch 支持全文搜索和复杂过滤
    public Page<OrderView> searchOrders(OrderSearchQuery query) {
        return elasticsearchRepo.search(query.toEsQuery(), query.getPageable());
    }
}
```

### 7.2.7 事件的定义规范

```java
public class OrderCreatedEvent {
    private final String eventId;        // 全局唯一，用于幂等
    private final String orderId;
    private final String userId;
    private final List<OrderItem> items;
    private final BigDecimal totalAmount;
    private final Instant occurredAt;    // 事件发生时间
    private final String source;         // 事件来源服务

    // 构造器、getter 省略
}
```

关键字段：
- **eventId**：全局唯一（UUID），消费者用它做幂等判断
- **occurredAt**：事件发生的业务时间，不是发送时间
- **source**：标识事件来源，便于排查和审计

---

## 7.3 Kafka 的角色

### 7.3.1 Kafka 的本质

Kafka 是一个**分布式提交日志**（Distributed Commit Log）。它的核心抽象是：

- **Topic**：消息的逻辑分类（如 `order-events`）
- **Partition**：Topic 的物理分区，保证同一 Partition 内消息有序
- **Offset**：消息在 Partition 中的位移，消费者通过 Offset 追踪消费进度
- **Consumer Group**：一组消费者协作消费一个 Topic，每个 Partition 只分配给组内一个消费者

```text
Topic: order-events
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Partition 0    │  │  Partition 1    │  │  Partition 2    │
│  offset: 0→1→2  │  │  offset: 0→1→2  │  │  offset: 0→1→2  │
│  [user-A orders]│  │  [user-B orders]│  │  [user-C orders]│
└─────────────────┘  └─────────────────┘  └─────────────────┘
        ↑                    ↑                    ↑
   Consumer-1           Consumer-2           Consumer-3
   (Group: inventory-service)
```

### 7.3.2 Kafka 典型场景对比

| 场景 | 使用方式 | 关键配置 | 说明 |
|------|---------|---------|------|
| **日志采集** | Filebeat → Kafka → ES/Flink | `acks=1`，高吞吐优先 | 容忍少量丢失，追求吞吐 |
| **数据同步** | Canal → Kafka → 下游 DB | `acks=all`，`enable.idempotence=true` | 要求不丢不重 |
| **异步解耦** | 业务服务 → Kafka → 消费者 | `acks=all`，配合事务表 | 订单/库存/支付解耦 |
| **流计算** | 数据源 → Kafka → Flink/Spark | 分区数匹配并行度 | 实时聚合、窗口计算 |
| **事件溯源** | 聚合根 → Kafka → 重放 | 保留全部历史（`retention=-1`） | 从事件日志重建状态 |

### 7.3.3 分区与键的选择

分区键决定了消息的路由和顺序保证：

```java
// 发送时指定 key，相同 key 的消息进入同一 Partition
producer.send(new ProducerRecord<>(
    "order-events",
    order.getUserId(),   // key: 保证同一用户的订单有序
    orderEvent
));
```

选择分区键的原则：
- **需要全局有序**：只用 1 个分区（吞吐受限）
- **需要局部有序**：按业务键分区（如同一用户、同一订单）
- **不需要有序**：轮询或随机分区（最大吞吐）

### 7.3.4 Kafka 与 RabbitMQ 的选型

| 维度 | Kafka | RabbitMQ |
|------|-------|----------|
| 模型 | 发布-订阅（拉模式） | 消息队列（推模式） |
| 吞吐 | 百万级/秒 | 万级/秒 |
| 消息堆积 | 能堆积海量（磁盘） | 堆积后性能下降 |
| 顺序保证 | 分区内有序 | 队列内有序 |
| 消息回溯 | 支持按 Offset 回溯 | 不支持（消费即删） |
| 适用场景 | 日志/事件流/大数据 | 业务消息/RPC |

---

## 7.4 消息可靠性

消息从生产到消费，每个环节都可能丢失。可靠性设计需要覆盖全链路。

### 7.4.1 消息丢失的三个环节

```text
Producer ──→ Broker ──→ Consumer
  ①发送失败    ②存储丢失    ③消费丢失
```

### 7.4.2 全链路可靠性机制

| 环节 | 机制 | 作用 | Kafka 实现 |
|------|------|------|-----------|
| **生产端** | 发送确认（ACK） | 确保消息到达 Broker | `acks=all`，重试 `retries>0` |
| **存储端** | 消息持久化 + 副本同步 | 确保 Broker 宕机不丢 | `replication.factor≥3`，`min.insync.replicas=2` |
| **消费端** | 手动提交 Offset | 确保处理完才确认 | `enable.auto.commit=false`，处理后手动 `commitSync` |
| **消费端** | 幂等消费 | 防止重复处理 | 消费者侧用 eventId 去重 |
| **全局** | 死信队列（DLQ） | 处理无法消费的消息 | 消费失败 N 次后转 DLQ Topic |

### 7.4.3 幂等消费的实现

消费者可能收到重复消息（网络抖动、Rebalance、ACK 丢失）。幂等保证"处理多次和处理一次效果相同"。

```java
@Component
public class OrderEventConsumer {

    @Autowired
    private RedisTemplate<String, String> redis;

    @Autowired
    private OrderRepository orderRepo;

    @KafkaListener(topics = "order-events")
    public void onOrderCreated(OrderCreatedEvent event) {
        String eventId = event.getEventId();

        // 幂等检查：用 SETNX 原子操作判断是否已处理
        Boolean isNew = redis.opsForValue()
            .setIfAbsent("processed:" + eventId, "1", 24, TimeUnit.HOURS);

        if (Boolean.FALSE.equals(isNew)) {
            log.info("重复消息，跳过: {}", eventId);
            return;
        }

        try {
            // 实际业务处理
            orderRepo.createOrder(event);
        } catch (Exception e) {
            // 处理失败，删除幂等标记，允许重试
            redis.delete("processed:" + eventId);
            throw e;
        }
    }
}
```

### 7.4.4 本地事务表 + 消息重试

解决"业务操作和消息发送的原子性"问题——数据库写入成功但消息发送失败，或消息发送成功但数据库回滚。

```java
@Service
public class OrderService {

    @Transactional
    public Order createOrder(CreateOrderRequest request) {
        // 1. 写业务表
        Order order = orderRepository.save(new Order(request));

        // 2. 写本地消息表（同一个事务）
        outboxRepository.save(new OutboxMessage(
            UUID.randomUUID().toString(),
            "OrderCreated",
            objectMapper.writeValueAsString(new OrderCreatedEvent(order))
        ));

        return order;
    }
}
```

```java
// 定时任务：扫描本地消息表，发送到 Kafka
@Scheduled(fixedDelay = 1000)
public void publishPendingMessages() {
    List<OutboxMessage> messages = outboxRepository.findUnsent(LIMIT);
    for (OutboxMessage msg : messages) {
        try {
            kafkaTemplate.send(msg.getTopic(), msg.getPayload()).get();
            msg.markSent();
            outboxRepository.save(msg);
        } catch (Exception e) {
            log.warn("消息发送失败，等待重试: {}", msg.getId());
        }
    }
}
```

### 7.4.5 死信队列（DLQ）

消费多次仍然失败的消息进入死信队列，避免阻塞正常消费：

```yaml
# Spring Boot 配置
spring:
  kafka:
    consumer:
      max-attempts: 3
    listener:
      ack-mode: manual_immediate
```

```java
@KafkaListener(topics = "order-events")
public void onEvent(OrderCreatedEvent event, Acknowledgment ack) {
    try {
        processEvent(event);
        ack.acknowledge();
    } catch (Exception e) {
        if (retryCount(event.getEventId()) >= 3) {
            // 发送到死信队列
            kafkaTemplate.send("order-events.DLQ", event);
            ack.acknowledge();  // 确认原消息，避免阻塞
        } else {
            throw e;  // 触发重试
        }
    }
}
```

### 7.4.7 消息可靠性的权衡

可靠性不是越高越好，需要根据业务场景选择：

| 场景 | 可靠性要求 | 策略 |
|------|-----------|------|
| 支付通知 | 最高 | `acks=all` + 本地事务表 + 幂等 + DLQ |
| 日志采集 | 较低 | `acks=1`，允许少量丢失 |
| 搜索索引更新 | 中等 | `acks=all` + 幂等，最终一致即可 |
| 实时推送 | 较低 | 最新消息优先，旧消息可丢 |
