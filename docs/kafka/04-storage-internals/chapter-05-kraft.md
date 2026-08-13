# KRaft 模式

## 1. 什么是 KRaft

Kafka Raft，去除 ZooKeeper 依赖，使用 Raft 协议管理元数据。

## 2. 优势

- 简化部署（无需 ZooKeeper）
- 更快的启动和恢复
- 更好的扩展性
- 降低运维复杂度

## 3. 配置

```properties
# KRaft 模式
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093
```

## 4. 迁移

```bash
# 从 ZooKeeper 迁移到 KRaft
kafka-storage.sh random-uuid
kafka-storage.sh format -t <uuid> -c server.properties
kafka-server-start.sh server.properties
```

## 5. 版本支持

- Kafka 3.3+：KRaft 生产就绪
- Kafka 4.0：默认 KRaft，移除 ZooKeeper

---
*待补充：更多 KRaft 细节*
