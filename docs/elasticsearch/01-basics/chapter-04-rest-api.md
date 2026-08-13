# REST API

## 1. 集群健康

```bash
GET /_cluster/health
```

## 2. 索引操作

```bash
# 创建索引
PUT /my-index
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  }
}

# 查看索引
GET /my-index

# 删除索引
DELETE /my-index
```

## 3. 文档操作

```bash
# 索引文档
POST /my-index/_doc/1
{
  "name": "张三",
  "age": 25
}

# 获取文档
GET /my-index/_doc/1

# 更新文档
POST /my-index/_update/1
{
  "doc": { "age": 26 }
}

# 删除文档
DELETE /my-index/_doc/1
```

## 4. 批量操作

```bash
POST /_bulk
{"index": {"_index": "my-index", "_id": "1"}}
{"name": "张三", "age": 25}
{"index": {"_index": "my-index", "_id": "2"}}
{"name": "李四", "age": 30}
```

## 5. Kibana Dev Tools

- 访问 `http://localhost:5601/app/dev_tools`
- 支持语法高亮、自动补全

---
*待补充：更多 API 操作*
