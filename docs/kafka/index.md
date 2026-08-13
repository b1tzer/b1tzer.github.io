# Kafka 技术体系

系统化的 Kafka 知识体系，从基础概念到生产者消费者，从存储原理到流处理。

## 目录结构

### 01-basics
- [Kafka 概览](01-basics/chapter-01-overview) — 发展历史、与 RabbitMQ/RocketMQ 对比
- [核心术语](01-basics/chapter-02-terminology) — Offset/ISR/Leader/Follower
- [整体架构](01-basics/chapter-03-architecture) — Broker/Topic/Partition/Consumer Group
- [消息队列选型](01-basics/chapter-04-mq-comparison) — 主流消息队列对比

### 02-producer
- [生产者 API](02-producer/chapter-01-producer-basics) — 发送流程、核心参数
- [分区策略](02-producer/chapter-02-partition-strategy) — 默认策略、自定义分区器
- [ACK 与重试](02-producer/chapter-03-acks-retries) — acks=0/1/all、幂等生产者
- [批量与压缩](02-producer/chapter-04-batch-compression) — 批量发送、压缩算法
- [事务生产者](02-producer/chapter-05-transaction-producer) — Exactly Once

### 03-consumer
- [消费者 API](03-consumer/chapter-01-consumer-basics) — 订阅与轮询
- [消费者组](03-consumer/chapter-02-consumer-group) — Rebalance 机制
- [Offset 管理](03-consumer/chapter-03-offset-management) — 自动/手动提交
- [Rebalance 策略](03-consumer/chapter-04-rebalance-strategy) — Range/RoundRobin/Sticky
- [消费者优化](03-consumer/chapter-05-consumer-optimization) — 多线程消费

### 04-storage-internals
- [日志分段](04-storage-internals/chapter-01-log-segment) — 索引文件、日志压缩
- [Page Cache](04-storage-internals/chapter-02-page-cache) — 零拷贝、高吞吐原因
- [副本机制](04-storage-internals/chapter-03-replication) — ISR、Leader 选举
- [Controller](04-storage-internals/chapter-04-controller) — 元数据管理
- [KRaft](04-storage-internals/chapter-05-kraft) — 去 ZooKeeper

### 05-reliability
- [ACK 机制](05-reliability/chapter-01-acks-机制) — acks=0/1/all
- [Exactly Once](05-reliability/chapter-02-exactly-once) — 幂等、事务
- [消息顺序](05-reliability/chapter-03-message-ordering) — 分区内顺序
- [数据保留](05-reliability/chapter-04-data-retention) — 时间/大小保留、日志压缩

### 06-streams
- [Streams 概览](06-streams/chapter-01-streams-basics) — DSL、KStream/KTable
- [流操作](06-streams/chapter-02-stream-operations) — 过滤/映射/聚合/连接
- [窗口操作](06-streams/chapter-03-windowing) — 翻转/跳跃/会话窗口
- [状态存储](06-streams/chapter-04-state-store) — RocksDB、交互式查询
- [Streams Exactly Once](06-streams/chapter-05-exactly-once-streams)

### 07-connect
- [Connect 概览](07-connect/chapter-01-connect-basics) — Source/Sink Connector
- [连接器配置](07-connect/chapter-02-connect-config) — 转换器、SMT
- [常用插件](07-connect/chapter-03-connect-plugins) — JDBC/Debezium/ES
- [Connect 监控](07-connect/chapter-04-connect-monitoring) — REST API、JMX

### 08-operations
- [集群管理](08-operations/chapter-01-cluster-management) — Topic 管理、分区重分配
- [监控](08-operations/chapter-02-monitoring) — JMX、Prometheus、Grafana
- [安全](08-operations/chapter-03-security) — SASL/ACL/SSL
- [跨集群镜像](08-operations/chapter-04-mirror) — MirrorMaker2
- [常见问题](08-operations/chapter-05-troubleshooting) — Lag/丢失/重复排查

### 09-practice
- [Spring 集成](09-practice/chapter-01-spring-integration) — Spring Kafka
- [常见场景](09-practice/chapter-02-common-patterns) — 日志收集/事件驱动/数据管道
- [性能调优](09-practice/chapter-03-performance-tuning) — 生产者/消费者/Broker 调优
