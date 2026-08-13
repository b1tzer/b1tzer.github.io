# NewSQL

## 1. TiDB

- 兼容 MySQL 协议
- 分布式事务
- 水平扩展

```bash
# TiUP 部署
tiup cluster deploy mydb v7.5.0 topology.yaml
tiup cluster start mydb
```

## 2. CockroachDB

- 兼容 PostgreSQL 协议
- 强一致性
- 自动分片

## 3. 适用场景

| 场景 | MySQL | NewSQL |
|------|-------|--------|
| 单机百万级 | ✅ | 过度 |
| 千万级分库分表 | 复杂 | ✅ |
| 亿级数据 | 分库分表 | ✅ |
| 强一致分布式 | ❌ | ✅ |

## 4. 迁移注意

- TiDB 不支持外键（6.6 前）
- 事务大小限制
- 自增 ID 行为不同

---
*待补充：更多 NewSQL 场景*
