# 监控

## 1. 核心指标

| 指标 | 说明 |
|------|------|
| UnderReplicatedPartitions | 副本不足的分区数 |
| ActiveControllerCount | 活跃 Controller 数 |
| OfflinePartitionsCount | 离线分区数 |
| BytesInPerSec | 每秒输入字节数 |
| BytesOutPerSec | 每秒输出字节数 |
| MessagesInPerSec | 每秒消息数 |

## 2. JMX 监控

```bash
# 启用 JMX
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.port=9999"
```

## 3. Prometheus + Grafana

```yaml
# JMX Exporter
rules:
  - pattern: "kafka.server<type=BrokerTopicMetrics, name=MessagesInPerSec><>Count"
    name: "kafka_messages_in_total"
    type: COUNTER
```

## 4. 常用监控工具

- Kafka Manager
- Kafka Offset Monitor
- Burrow (消费者 Lag 监控)
- Confluent Control Center

---
*待补充：更多监控细节*
