# 连接器配置

## 1. 通用配置

```json
{
  "name": "my-connector",
  "config": {
    "connector.class": "com.example.MyConnector",
    "tasks.max": 3,
    "topics": "topic1,topic2",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.json.JsonConverter"
  }
}
```

## 2. 转换器

| 转换器 | 说明 |
|--------|------|
| StringConverter | 字符串 |
| JsonConverter | JSON |
| AvroConverter | Avro（Schema Registry） |
| ProtobufConverter | Protobuf |

## 3. 单消息转换 (SMT)

```json
{
  "transforms": "route",
  "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
  "transforms.route.regex": "^(.*)$",
  "transforms.route.replacement": "target-topic"
}
```

## 4. 常用 SMT

- InsertField：添加字段
- ReplaceField：重命名/过滤字段
- TimestampRouter：按时间路由
- RegexRouter：正则路由

---
*待补充：更多连接器配置*
