# 查询优化

## 1. 使用 filter 替代 query

```json
# 慢
{ "query": { "range": { "price": { "gte": 100 } } } }

# 快（可缓存）
{ "query": { "bool": { "filter": { "range": { "price": { "gte": 100 } } } } } }
```

## 2. 避免深度分页

```json
# 慢
{ "from": 10000, "size": 10 }

# 快
{ "size": 10, "search_after": [123456] }
```

## 3. 使用 _source 过滤

```json
GET /my-index/_search
{
  "_source": ["name", "age"],
  "query": { "match_all": {} }
}
```

## 4. 避免脚本查询

```json
# 慢
{ "query": { "script": { "script": "doc['price'].value > 100" } } }

# 快
{ "query": { "range": { "price": { "gt": 100 } } } }
```

---
*待补充：更多查询优化*
