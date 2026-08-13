# 消息集成

## 1. Kafka

```java
@Service
public class KafkaProducer {
    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;
    
    public void send(String topic, String message) {
        kafkaTemplate.send(topic, message);
    }
}

@Component
public class KafkaConsumer {
    @KafkaListener(topics = "my-topic", groupId = "my-group")
    public void consume(String message) {
        // 处理消息
    }
}
```

## 2. RabbitMQ

```java
@Configuration
public class RabbitConfig {
    @Bean
    public Queue queue() {
        return new Queue("my-queue");
    }
    
    @Bean
    public DirectExchange exchange() {
        return new DirectExchange("my-exchange");
    }
    
    @Bean
    public Binding binding(Queue queue, DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with("routing-key");
    }
}
```

## 3. 消息集成高级用法

### 3.1 Kafka 事务消息

```java
@Service
public class OrderEventPublisher {

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    // 事务消息：数据库操作和消息发送在同一事务中
    @Transactional
    public void createOrderAndPublish(OrderRequest request) {
        // 1. 保存订单到数据库
        Order order = orderRepository.save(new Order(request));

        // 2. 发送 Kafka 消息（与数据库在同一事务中）
        kafkaTemplate.send("order-events", order.getId().toString(),
            new OrderCreatedEvent(order.getId(), order.getUserId(), order.getAmount()));
    }
}
```

### 3.2 Kafka 消费者幂等

```java
@Component
public class OrderEventListener {

    @KafkaListener(topics = "order-events", groupId = "notification-group")
    public void handleOrderEvent(String message,
            @Header(KafkaHeaders.RECEIVED_KEY) String key,
            @Header(KafkaHeaders.OFFSET) long offset) {

        // 幂等处理：记录已处理的消息 ID
        String messageId = key + ":" + offset;
        if (processedMessageRepository.existsById(messageId)) {
            log.info("消息已处理，跳过: {}", messageId);
            return;
        }

        try {
            OrderCreatedEvent event = objectMapper.readValue(message, OrderCreatedEvent.class);
            // 处理业务逻辑
            notificationService.sendOrderConfirmation(event);
            // 记录已处理
            processedMessageRepository.save(new ProcessedMessage(messageId));
        } catch (Exception e) {
            log.error("消息处理失败: {}", messageId, e);
            // 发送到死信队列
            kafkaTemplate.send("order-events-dlq", key, message);
        }
    }
}
```

### 3.3 RabbitMQ 死信队列

```java
@Configuration
public class RabbitDlqConfig {

    // 正常队列
    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable("order-queue")
            .withArgument("x-dead-letter-exchange", "dlx-exchange")
            .withArgument("x-dead-letter-routing-key", "dlq.order")
            .withArgument("x-message-ttl", 60000)  // 消息 TTL 60 秒
            .build();
    }

    // 死信队列
    @Bean
    public Queue orderDlq() {
        return QueueBuilder.durable("order-dlq").build();
    }

    @Bean
    public DirectExchange dlxExchange() {
        return new DirectExchange("dlx-exchange");
    }

    @Bean
    public Binding dlqBinding() {
        return BindingBuilder.bind(orderDlq()).to(dlxExchange()).with("dlq.order");
    }
}

// 重试机制
@Component
public class OrderMessageConsumer {

    @RabbitListener(queues = "order-queue")
    public void handleMessage(OrderMessage message, Channel channel,
            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            processOrder(message);
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("消息处理失败，进入死信队列", e);
            // 拒绝消息，不重新入队（进入 DLQ）
            channel.basicNack(deliveryTag, false, false);
        }
    }
}
```

### 3.4 Spring Cloud Stream

```java
// 声明式消息发送
public interface OrderEventSource {

    @Output("order-created")
    MessageChannel orderCreated();

    @Output("order-cancelled")
    MessageChannel orderCancelled();
}

// 声明式消息消费
public interface OrderEventSink {

    @Input("order-created")
    SubscribableChannel orderCreated();
}

// 使用
@EnableBinding({OrderEventSource.class, OrderEventSink.class})
public class OrderEventHandler {

    @Autowired
    private OrderEventSource source;

    public void publishOrderCreated(Order order) {
        source.orderCreated().send(
            MessageBuilder.withPayload(order)
                .setHeader("contentType", "application/json")
                .build());
    }

    @StreamListener("order-created")
    public void handleOrderCreated(Order order) {
        // 处理订单创建事件
    }
}
```

**最佳实践：**

1. **消息设计为不可变**——消息一旦发送就不应修改
2. **消费者必须幂等**——网络抖动可能导致重复消费
3. **死信队列必须有**——消费失败的消息要有归宿
4. **消息体不要太大**——超过 1MB 考虑传 ID，消费方按需查询
5. **监控消息积压**——消费 Lag 超过阈值要及时告警
