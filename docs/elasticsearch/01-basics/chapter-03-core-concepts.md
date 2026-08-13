# 核心概念

## 1. 文档 (Document)

- ES 中最小数据单元
- JSON 格式
- 有唯一 _id

## 2. 索引 (Index)

- 文档的集合
- 类似数据库中的表
- 有映射（Mapping）定义字段类型

## 3. 分片 (Shard)

- 索引的物理分片
- 主分片（Primary）：写入
- 副本分片（Replica）：冗余备份

## 4. 节点 (Node)

| 角色 | 说明 |
|------|------|
| Master | 集群管理 |
| Data | 数据存储 |
| Coordinating | 查询协调 |
| Ingest | 数据预处理 |

## 5. 集群 (Cluster)

```
┌─────────────────────────────────┐
│        Cluster                  │
│  ┌─────────┐  ┌─────────┐     │
│  │ Node 1  │  │ Node 2  │     │
│  │ (Master)│  │ (Data)  │     │
│  │         │  │         │     │
│  │ Shard 0 │  │ Shard 1 │     │
│  │ Replica1│  │ Replica0│     │
│  └─────────┘  └─────────┘     │
└─────────────────────────────────┘
```

## 6. 与关系型数据库对比

| ES | RDBMS |
|----|-------|
| Index | Table |
| Document | Row |
| Field | Column |
| Mapping | Schema |

---
*待补充：更多核心概念*
