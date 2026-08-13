# 指标聚合

## 1. 基本指标

```json
GET /my-index/_search
{
  "size": 0,
  "aggs": {
    "avg_price": { "avg": { "field": "price" } },
    "max_price": { "max": { "field": "price" } },
    "min_price": { "min": { "field": "price" } },
    "sum_price": { "sum": { "field": "price" } },
    "count": { "value_count": { "field": "price" } }
  }
}
```

## 2. stats 聚合

```json
GET /my-index/_search
{
  "size": 0,
  "aggs": {
    "price_stats": { "stats": { "field": "price" } }
  }
}
```

## 3. percentiles 聚合

```json
GET /my-index/_search
{
  "size": 0,
  "aggs": {
    "price_percentiles": {
      "percentiles": { "field": "price" }
    }
  }
}
```

## 4. cardinality 聚合（去重）

```json
GET /my-index/_search
{
  "size": 0,
  "aggs": {
    "unique_users": {
      "cardinality": { "field": "user_id" }
    }
  }
}
```

---
*待补充：更多指标聚合*
