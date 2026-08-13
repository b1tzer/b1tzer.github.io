# 备份恢复

## 1. Snapshot/Restore 概述

ES 使用 Snapshot（快照）机制进行备份，支持增量备份，可以备份到本地或远程存储（S3、HDFS、Azure Blob 等）。

## 2. 配置仓库

### 2.1 本地仓库

```json
// 创建本地仓库
PUT /_snapshot/my_backup
{
  "type": "fs",
  "settings": {
    "location": "/data/backups/es",
    "compress": true,
    "max_snapshot_bytes_per_sec": "50mb",
    "max_restore_bytes_per_sec": "50mb"
  }
}
```

```yaml
# elasticsearch.yml 中配置仓库路径
path.repo: ["/data/backups"]
```

### 2.2 S3 仓库

```bash
# 安装 S3 插件
./bin/elasticsearch-plugin install repository-s3
```

```json
PUT /_snapshot/s3_backup
{
  "type": "s3",
  "settings": {
    "bucket": "my-es-backups",
    "region": "us-east-1",
    "base_path": "prod-cluster"
  }
}
```

## 3. 创建快照

```json
// 备份所有索引
PUT /_snapshot/my_backup/snapshot_20240115
{
  "indices": "*",
  "ignore_unavailable": true,
  "include_global_state": true
}

// 备份指定索引
PUT /_snapshot/my_backup/snapshot_20240115
{
  "indices": "orders,users,products",
  "ignore_unavailable": true
}

// 增量快照（只备份变化的 Segment）
PUT /_snapshot/my_backup/snapshot_20240116
{
  "indices": "*"
}
```

## 4. 查看快照

```json
// 查看所有快照
GET /_snapshot/my_backup/_all

// 查看特定快照
GET /_snapshot/my_backup/snapshot_20240115

// 查看快照状态
GET /_snapshot/my_backup/snapshot_20240115/_status
```

## 5. 恢复快照

```json
// 恢复所有索引
POST /_snapshot/my_backup/snapshot_20240115/_restore

// 恢复指定索引
POST /_snapshot/my_backup/snapshot_20240115/_restore
{
  "indices": "orders,users",
  "ignore_unavailable": true,
  "include_global_state": false
}

// 恢复到新索引名
POST /_snapshot/my_backup/snapshot_20240115/_restore
{
  "indices": "orders",
  "rename_pattern": "(.+)",
  "rename_replacement": "restored_$1"
}
```

## 6. 自动化备份

```bash
#!/bin/bash
# backup_es.sh
DATE=$(date +%Y%m%d)
curl -X PUT "localhost:9200/_snapshot/my_backup/snapshot_$DATE" -H 'Content-Type: application/json' -d '{
  "indices": "*",
  "ignore_unavailable": true
}'

# 清理 30 天前的快照
curl -X DELETE "localhost:9200/_snapshot/my_backup/snapshot_$(date -d '30 days ago' +%Y%m%d)"
```

```bash
# crontab
0 2 * * * /opt/scripts/backup_es.sh
```

## 7. SLM（Snapshot Lifecycle Management）

```json
PUT /_slm/policy/backup-policy
{
  "schedule": "0 30 1 * * ?",
  "name": "<snapshot-{now/d}>",
  "repository": "my_backup",
  "config": {
    "indices": ["*"],
    "ignore_unavailable": true,
    "include_global_state": false
  },
  "retention": {
    "expire_after": "30d",
    "min_count": 5,
    "max_count": 50
  }
}
```

## 8. 最佳实践

- 生产环境必须配置自动备份
- 使用 SLM 策略自动化快照管理
- 备份到远程存储（S3/HDFS），避免本地磁盘故障
- 定期验证备份可恢复性
- 增量快照节省存储空间和时间
- 保留至少 30 天的备份历史
