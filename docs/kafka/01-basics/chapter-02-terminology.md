# 核心术语

## 1. 核心概念

| 术语 | 说明 |
|------|------|
| Broker | Kafka 服务器节点 |
| Topic | 消息主题，逻辑分类 |
| Partition | 分区，Topic 的物理分片 |
| Offset | 消息在分区中的偏移量 |
| Producer | 生产者，发送消息 |
| Consumer | 消费者，接收消息 |
| Consumer Group | 消费者组，组内竞争消费 |

## 2. 副本相关

| 术语 | 说明 |
|------|------|
| Replica | 副本，分区的备份 |
| Leader | 主副本，处理读写 |
| Follower | 从副本，同步 Leader 数据 |
| ISR | In-Sync Replicas，同步副本集 |
| AR | Assigned Replicas，所有副本 |

## 3. 消息格式

```
┌─────────────────┐
│ Offset (8字节)   │
├─────────────────┤
│ Message Size    │
├─────────────────┤
│ CRC             │
├─────────────────┤
│ Timestamp       │
├─────────────────┤
│ Key (可选)       │
├─────────────────┤
│ Value           │
└─────────────────┘
```

---
*待补充：更多术语解释*
