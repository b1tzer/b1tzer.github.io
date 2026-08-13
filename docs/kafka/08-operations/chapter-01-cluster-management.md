# 集群管理

## 1. Topic 管理

```bash
# 创建 Topic
kafka-topics.sh --create --topic my-topic --partitions 3 --replication-factor 3 --bootstrap-server localhost:9092

# 查看 Topic
kafka-topics.sh --describe --topic my-topic --bootstrap-server localhost:9092

# 修改分区
kafka-topics.sh --alter --topic my-topic --partitions 6 --bootstrap-server localhost:9092

# 删除 Topic
kafka-topics.sh --delete --topic my-topic --bootstrap-server localhost:9092
```

## 2. 配置管理

```bash
# 查看配置
kafka-configs.sh --describe --entity-type topics --entity-name my-topic --bootstrap-server localhost:9092

# 修改配置
kafka-configs.sh --alter --entity-type topics --entity-name my-topic --add-config retention.ms=86400000 --bootstrap-server localhost:9092
```

## 3. 分区重分配

```bash
# 生成重分配计划
kafka-reassign-partitions.sh --generate --topics-to-move-json-file topics.json --broker-list 1,2,3 --bootstrap-server localhost:9092

# 执行重分配
kafka-reassign-partitions.sh --execute --reassignment-json-file plan.json --bootstrap-server localhost:9092
```

---
*待补充：更多集群管理*
