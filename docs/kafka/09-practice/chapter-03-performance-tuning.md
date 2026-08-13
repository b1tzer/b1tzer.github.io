# 性能调优

## 1. 生产者调优

```properties
batch.size=16384
linger.ms=5
compression.type=lz4
buffer.memory=33554432
```

## 2. 消费者调优

```properties
max.poll.records=500
fetch.min.bytes=1
fetch.max.wait.ms=500
```

## 3. Broker 调优

```properties
num.network.threads=3
num.io.threads=8
log.flush.interval.messages=10000
log.flush.interval.ms=1000
```

## 4. 分区数

- 分区数 = 消费者数（理想情况）
- 分区过多：增加元数据开销
- 分区过少：限制并发

## 5. 副本数

- 副本数 = 3（推荐）
- min.insync.replicas = 2

---
*待补充：更多调优细节*
