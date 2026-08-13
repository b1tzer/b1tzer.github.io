# Kafka Connect 概览

## 1. 什么是 Kafka Connect

- 数据集成框架
- Source Connector：从外部系统读取数据到 Kafka
- Sink Connector：从 Kafka 写入数据到外部系统

## 2. 核心概念

| 概念 | 说明 |
|------|------|
| Connector | 连接器，定义数据源/目标 |
| Task | 任务，实际执行数据传输 |
| Worker | 工作节点，运行 Task |
| Converter | 转换器，序列化/反序列化 |

## 3. Standalone vs Distributed

| 模式 | 说明 | 适用场景 |
|------|------|---------|
| Standalone | 单节点 | 开发测试 |
| Distributed | 多节点 | 生产环境 |

## 4. 配置示例

```json
{
  "name": "jdbc-source",
  "config": {
    "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
    "connection.url": "jdbc:mysql://localhost:3306/mydb",
    "table.whitelist": "users",
    "mode": "incrementing",
    "incrementing.column.name": "id",
    "topic.prefix": "jdbc-"
  }
}
```

---
*待补充：更多 Connect 细节*
