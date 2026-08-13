# 进程架构

## 1. 多进程模型

PostgreSQL 采用多进程架构，主要进程：

| 进程 | 说明 |
|------|------|
| Postmaster | 主进程，监听连接，fork Backend |
| Backend | 每个客户端连接一个 |
| Background Writer | 将脏页写入磁盘 |
| WAL Writer | 将 WAL 缓冲写入磁盘 |
| Checkpointer | 执行检查点 |
| Autovacuum | 自动清理死元组 |
| Stats Collector | 收集统计信息 |

## 2. 连接流程

```
Client → Postmaster → fork → Backend → 处理查询 → 返回结果
```

## 3. 进程间通信

- 共享内存（Shared Buffer、WAL Buffer）
- 信号量（Semaphore）
- 消息队列

---
*待补充：更多进程细节*
