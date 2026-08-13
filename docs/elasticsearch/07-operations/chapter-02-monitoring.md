# 监控

## 1. 集群健康

```json
GET /_cluster/health

GET /_cat/nodes?v
GET /_cat/indices?v
GET /_cat/shards?v
```

## 2. 核心指标

| 指标 | 说明 |
|------|------|
| cluster_status | Green/Yellow/Red |
| number_of_nodes | 节点数 |
| active_shards | 活跃分片数 |
| relocating_shards | 迁移中分片数 |
| initializing_shards | 初始化中分片数 |
| unassigned_shards | 未分配分片数 |

## 3. Prometheus + Grafana

```yaml
# elasticsearch exporter
docker run -d --name es-exporter \
  -p 9114:9114 \
  justwatch/elasticsearch_exporter \
  --es.uri=http://localhost:9200
```

## 4. 常用监控工具

- Kibana Monitoring
- Prometheus + Grafana
- Elastic APM
- Cerebro

---
*待补充：更多监控细节*
