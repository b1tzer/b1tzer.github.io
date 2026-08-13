# 常用连接器插件

## 1. JDBC Connector

```json
{
  "connector.class": "io.confluent.connect.jdbc.JdbcSourceConnector",
  "connection.url": "jdbc:mysql://localhost:3306/mydb",
  "table.whitelist": "users",
  "mode": "incrementing",
  "incrementing.column.name": "id"
}
```

## 2. Debezium (CDC)

```json
{
  "connector.class": "io.debezium.connector.mysql.MySqlConnector",
  "database.hostname": "localhost",
  "database.port": 3306,
  "database.user": "root",
  "database.password": "***",
  "database.server.id": 1,
  "database.include.list": "mydb",
  "database.history.kafka.bootstrap.servers": "localhost:9092",
  "database.history.kafka.topic": "schema-changes"
}
```

## 3. Elasticsearch Connector

```json
{
  "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
  "connection.url": "http://localhost:9200",
  "topics": "my-topic",
  "type.name": "_doc",
  "key.ignore": true
}
```

---
*待补充：更多连接器插件*
