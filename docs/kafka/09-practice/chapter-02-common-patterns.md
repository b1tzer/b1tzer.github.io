# 常见场景

## 1. 日志收集

```
App → Kafka → Logstash → Elasticsearch → Kibana
```

## 2. 事件驱动架构

```
Service A → Kafka → Service B
                → Service C
                → Service D
```

## 3. 数据管道

```
MySQL → Debezium → Kafka → Elasticsearch
                        → Data Warehouse
```

## 4. 流式处理

```
Kafka → Kafka Streams/Flink → Kafka
```

## 5. 指标监控

```
App → Kafka → Prometheus/Grafana
```

---
*待补充：更多场景*
