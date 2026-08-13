# 日志分段与索引

## 1. 日志分段

```
topic-partition-0/
├── 00000000000000000000.log    # 第一个日志段
├── 00000000000000000000.index  # 偏移量索引
├── 00000000000000000000.timeindex  # 时间戳索引
├── 00000000000000001234.log    # 第二个日志段
├── 00000000000000001234.index
└── 00000000000000001234.timeindex
```

## 2. 索引结构

- 偏移量索引：Offset → 文件位置
- 时间戳索引：Timestamp → Offset

## 3. 日志清理策略

```properties
# 删除策略（默认）
log.retention.hours=168
log.retention.bytes=-1

# 压缩策略
log.cleanup.policy=compact
```

## 4. 日志压缩

- 保留每个 Key 的最新值
- 适合变更日志（Changelog）

---
*待补充：更多存储细节*
