# 文档 CRUD

## 1. 索引文档

```bash
# 指定 ID
POST /my-index/_doc/1
{
  "name": "张三",
  "age": 25,
  "email": "zhangsan@example.com"
}

# 自动生成 ID
POST /my-index/_doc
{
  "name": "李四",
  "age": 30
}
```

## 2. 获取文档

```bash
GET /my-index/_doc/1

# 获取特定字段
GET /my-index/_doc/1?_source=name,age
```

## 3. 更新文档

```bash
# 部分更新
POST /my-index/_update/1
{
  "doc": { "age": 26 }
}

# 脚本更新
POST /my-index/_update/1
{
  "script": {
    "source": "ctx._source.age += params.age",
    "params": { "age": 1 }
  }
}
```

## 4. Bulk API

```bash
POST /_bulk
{"index": {"_index": "my-index", "_id": "1"}}
{"name": "张三", "age": 25}
{"update": {"_index": "my-index", "_id": "1"}}
{"doc": {"age": 26}}
{"delete": {"_index": "my-index", "_id": "2"}}
```

---
*待补充：更多文档操作*
