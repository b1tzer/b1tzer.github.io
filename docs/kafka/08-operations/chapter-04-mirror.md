# 跨集群镜像

## 1. MirrorMaker2

```properties
# connect-mirror-maker.properties
clusters = east, west
east.bootstrap.servers = east-kafka:9092
west.bootstrap.servers = west-kafka:9092

east->west.enabled = true
west->east.enabled = true

# 主题重命名
replication.policy.class = org.apache.kafka.connect.mirror.IdentityReplicationPolicy
```

## 2. 使用场景

- 跨数据中心复制
- 灾难恢复
- 数据迁移

## 3. 配置

```bash
# 启动 MirrorMaker2
connect-mirror-maker.sh connect-mirror-maker.properties
```

## 4. 监控

```bash
# 查看复制状态
kafka-mirror-maker.sh --describe --bootstrap-server localhost:9092
```

---
*待补充：更多镜像细节*
