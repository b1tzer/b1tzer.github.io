# 数据保留策略

## 1. 时间保留

```properties
log.retention.hours=168        # 7天（默认）
log.retention.minutes=10080
log.retention.ms=604800000
```

## 2. 大小保留

```properties
log.retention.bytes=-1         # 不限制（默认）
log.segment.bytes=1073741824   # 1GB
```

## 3. 日志压缩

```properties
log.cleanup.policy=compact     # 压缩策略
log.cleaner.min.compaction.lag.ms=0
log.cleaner.max.compaction.lag.ms=9223372036854775807
```

适合场景：变更日志（Changelog），保留每个 Key 最新值。

## 4. 混合策略

```properties
log.cleanup.policy=delete,compact
```

---
*待补充：更多保留策略细节*
