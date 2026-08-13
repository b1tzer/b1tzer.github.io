# 写入流程

## 1. 文档写入流程

```
Client → Coordinating Node → Primary Shard → Replica Shards
```

## 2. Refresh

- 将 Buffer 中的数据写入 Segment
- 默认 1s 一次
- 写入后可搜索（近实时）

```json
POST /my-index/_refresh
```

## 3. Flush

- 将 Translog 数据持久化到磁盘
- 清空 Translog

```json
POST /my-index/_flush
```

## 4. Translog

- 事务日志，保证数据不丢失
- 每次写入先写 Translog
- Flush 后清空

## 5. 近实时搜索

```
写入 → Buffer → Refresh → Segment → 可搜索
              ↓
           Translog（持久化）
```

---
*待补充：更多写入流程*
