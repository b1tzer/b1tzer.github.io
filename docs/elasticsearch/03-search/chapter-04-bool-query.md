# 布尔查询

## 1. bool 查询

```json
GET /my-index/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "Elasticsearch" } }
      ],
      "should": [
        { "match": { "content": "入门" } },
        { "match": { "content": "教程" } }
      ],
      "must_not": [
        { "term": { "status": "draft" } }
      ],
      "filter": [
        { "range": { "price": { "gte": 100, "lte": 500 } } }
      ]
    }
  }
}
```

## 2. 子句说明

| 子句 | 说明 | 影响得分 |
|------|------|---------|
| must | 必须匹配 | ✅ |
| should | 应该匹配 | ✅ |
| must_not | 必须不匹配 | ❌ |
| filter | 必须匹配 | ❌ |

## 3. 最佳实践

- 使用 filter 替代 must（可缓存）
- 避免嵌套过深
- 使用 constant_score 包装精确查询

---
*待补充：更多布尔查询*
