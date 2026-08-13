# 常见问题排查

## 1. 消费者 Lag 过大

```bash
# 查看消费者 Lag
kafka-consumer-groups.sh --describe --group my-group --bootstrap-server localhost:9092
```

解决：
- 增加消费者数量
- 增加分区数
- 优化消费者处理速度

## 2. 消息丢失

| 阶段 | 原因 | 解决 |
|------|------|------|
| 生产者 | acks=0/1 | acks=all |
| Broker | 副本不足 | min.insync.replicas=2 |
| 消费者 | 自动提交 | 手动提交 Offset |

## 3. 消息重复

- 生产者重试 → 幂等生产者
- 消费者重复 → 幂等消费

## 4. 磁盘空间不足

```bash
# 清理日志
kafka-delete-records.sh --offset-json-file offsets.json --bootstrap-server localhost:9092
```

---
*待补充：更多问题排查*
