# 副本机制

## 1. 副本角色

- Leader：处理读写请求
- Follower：同步 Leader 数据
- ISR：与 Leader 保持同步的副本集

## 2. ISR 机制

```properties
# ISR 最小副本数
min.insync.replicas=2

# 同步超时
replica.lag.time.max.ms=30000
```

## 3. Leader 选举

```properties
# 自动 Leader 平衡
auto.leader.rebalance.enable=true
leader.imbalance.per.broker.percentage=10
```

## 4. 数据同步

```
Producer → Leader → Follower1
                  → Follower2
                  → Follower3
```

- acks=all 时，需要 ISR 全部确认
- ISR 数量不足时，可能拒绝写入

---
*待补充：更多副本细节*
