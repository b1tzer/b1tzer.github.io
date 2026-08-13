# ACK 机制

## 1. acks 配置

| acks | 说明 | 可靠性 | 吞吐量 |
|------|------|--------|--------|
| 0 | 不等待确认 | 低 | 高 |
| 1 | Leader 确认 | 中 | 中 |
| all | ISR 全部确认 | 高 | 低 |

## 2. 数据丢失场景

```properties
# acks=1 时
Leader 写入成功 → 返回确认 → Leader 宕机 → Follower 未同步 → 数据丢失

# 解决：acks=all + min.insync.replicas=2
```

## 3. 配置建议

```properties
# 高可靠配置
acks=all
min.insync.replicas=2
retries=Integer.MAX_VALUE
enable.idempotence=true
```

---
*待补充：更多可靠性细节*
