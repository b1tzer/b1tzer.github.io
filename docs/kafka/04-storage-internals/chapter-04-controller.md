# Controller

## 1. Controller 职责

- 分区 Leader 选举
- 分区副本分配
- Topic 创建/删除
- Broker 上下线处理

## 2. Controller 选举

- 通过 ZooKeeper 选举
- 每个 Broker 竞争 /controller 节点
- 第一个创建成功的成为 Controller

## 3. Controller 通知

```
Broker 上下线 → ZooKeeper 通知 → Controller 处理 → 更新元数据
```

## 4. Controller 问题

- 单点故障风险
- 重启时需要加载全量元数据
- KRaft 模式解决此问题

---
*待补充：更多 Controller 细节*
