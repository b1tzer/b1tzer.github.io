# 集群管理

## 1. 节点管理

### 1.1 添加节点

```yaml
# 新节点 elasticsearch.yml
cluster.name: prod-cluster
node.name: node-4
discovery.seed_hosts: ["node-1", "node-2", "node-3"]
node.roles: ["data"]
```

### 1.2 移除节点（优雅下线）

```json
// 1. 排空节点上的分片
PUT /_cluster/settings
{
  "transient": {
    "cluster.routing.allocation.exclude._name": "node-4"
  }
}

// 2. 等待分片迁移完成
GET /_cat/shards?v&h=index,shard,prirep,state,node&s=node

// 3. 停止节点
```

### 1.3 节点角色配置

```yaml
# 专用 Master 节点
node.roles: [master]
node.master: true
node.data: false

# 专用 Data 节点
node.roles: [data]
node.master: false
node.data: true

# Ingest 节点
node.roles: [ingest]
```

## 2. 分片管理

### 2.1 查看分片分配

```json
GET /_cat/shards?v&h=index,shard,prirep,state,docs,store,node&s=store:desc

// 查看分片分配原因
GET /_cluster/allocation/explain
{
  "index": "my-index",
  "shard": 0,
  "primary": true
}
```

### 2.2 手动移动分片

```json
POST /_cluster/reroute
{
  "commands": [
    {
      "move": {
        "index": "my-index",
        "shard": 0,
        "from_node": "node-1",
        "to_node": "node-2"
      }
    }
  ]
}
```

### 2.3 分片分配控制

```json
// 禁止分片分配（维护时使用）
PUT /_cluster/settings
{
  "transient": {
    "cluster.routing.allocation.enable": "none"
  }
}

// 恢复分片分配
PUT /_cluster/settings
{
  "transient": {
    "cluster.routing.allocation.enable": "all"
  }
}
```

## 3. 索引管理

```json
// 关闭索引（不占用资源）
POST /my-index/_close

// 打开索引
POST /my-index/_open

// 冻结索引（只读，极少资源占用）
POST /my-index/_freeze

// 解冻索引
POST /my-index/_unfreeze
```

## 4. 集群设置

```json
// 查看集群设置
GET /_cluster/settings?include_defaults=true

// 临时设置（重启后失效）
PUT /_cluster/settings
{
  "transient": {
    "cluster.max_shards_per_node": 1000
  }
}

// 持久设置（重启后保留）
PUT /_cluster/settings
{
  "persistent": {
    "cluster.max_shards_per_node": 1000
  }
}
```

## 5. 最佳实践

- 生产环境至少 3 个 Master 节点
- 节点下线前先排空分片
- 维护操作前禁止分片分配，操作完成后恢复
- 监控节点磁盘使用率，设置合理的水位线
- 单个节点分片数不超过 1000
- 使用 `_cat` API 定期检查集群状态
