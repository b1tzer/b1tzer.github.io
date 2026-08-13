# 第四卷 高可用与分布式

> 回答「服务如何不宕机、如何协作」。从主从、哨兵到集群的高可用三阶梯，再到分布式锁、事务与 Lua、Pipeline 等协作原语，理解 Redis 在分布式环境下的能力边界。

## 章节

- [第1章 主从复制](chapter-01-replication) — 同步流程、读写分离、异步复制
- [第2章 哨兵模式](chapter-02-sentinel) — 职责、故障转移流程、配置
- [第3章 集群模式](chapter-03-cluster) — 分片原理、MOVED/ASK、哈希标签、选型
- [第4章 分布式锁](chapter-04-distributed-lock) — SETNX、原子锁、Redisson、看门狗、RedLock
- [第5章 事务与 Lua](chapter-05-transaction-lua) — MULTI/EXEC、WATCH、Lua
- [第6章 Pipeline 与 PubSub](chapter-06-pipeline-pubsub) — Pipeline、发布订阅、三者对比
