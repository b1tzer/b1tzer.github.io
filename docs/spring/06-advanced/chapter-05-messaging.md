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

---
*待补充：更多消息场景*
