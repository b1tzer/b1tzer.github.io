# Connect 监控

## 1. REST API

```bash
# 查看连接器状态
curl http://localhost:8083/connectors/my-connector/status

# 查看所有连接器
curl http://localhost:8083/connectors

# 暂停连接器
curl -X PUT http://localhost:8083/connectors/my-connector/pause

# 恢复连接器
curl -X PUT http://localhost:8083/connectors/my-connector/resume
```

## 2. JMX 指标

| 指标 | 说明 |
|------|------|
| connector-startup-attempts-total | 启动尝试次数 |
| connector-failed-tasks | 失败任务数 |
| task-startup-attempts-total | 任务启动尝试次数 |
| source-record-poll-rate | Source 记录拉取速率 |
| sink-record-send-rate | Sink 记录发送速率 |

## 3. Prometheus 监控

```yaml
# JMX Exporter 配置
rules:
  - pattern: "kafka.connect<type=connect-worker-metrics>([^:]+):"
    name: "kafka_connect_worker_$1"
    type: GAUGE
```

---
*待补充：更多监控细节*
