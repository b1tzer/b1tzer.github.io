# 全文搜索

## 1. match 查询

```json
GET /my-index/_search
{
  "query": {
    "match": {
      "title": "Elasticsearch 入门"
    }
  }
}
```

## 2. match_phrase 查询

```json
GET /my-index/_search
{
  "query": {
    "match_phrase": {
      "title": "Elasticsearch 入门"
    }
  }
}
```

## 3. multi_match 查询

```json
GET /my-index/_search
{
  "query": {
    "multi_match": {
      "query": "Elasticsearch",
      "fields": ["title", "content", "description"]
    }
  }
}
```

## 4. 查询与过滤

| 上下文 | 说明 | 缓存 |
|--------|------|------|
| Query | 计算相关性得分 | 不缓存 |
| Filter | 是/否判断 | 缓存 |

```json
GET /my-index/_search
{
  "query": {
    "bool": {
      "must": [{ "match": { "title": "Elasticsearch" } }],
      "filter": [{ "range": { "price": { "gte": 100 } } }]
    }
  }
}
```

---
*待补充：更多全文搜索*
