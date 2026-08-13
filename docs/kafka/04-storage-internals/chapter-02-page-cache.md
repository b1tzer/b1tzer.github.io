# Page Cache 与零拷贝

## 1. Page Cache

Kafka 利用操作系统 Page Cache 缓存消息：
- 写入：先写 Page Cache，异步刷盘
- 读取：优先从 Page Cache 读取

## 2. 零拷贝

```
传统方式：
磁盘 → 内核缓冲区 → 用户缓冲区 → Socket缓冲区 → 网卡

零拷贝（sendfile）：
磁盘 → 内核缓冲区 → 网卡
```

Kafka 使用 `sendfile()` 系统调用，减少数据拷贝次数。

## 3. 高吞吐原因

1. 顺序写磁盘
2. Page Cache
3. 零拷贝
4. 批量发送
5. 压缩

```properties
# 刷盘策略
log.flush.interval.messages=10000
log.flush.interval.ms=1000
```

---
*待补充：更多存储细节*
