# 数据建模原则

## 1. 建模原则

- 根据查询需求建模，而非数据结构
- 优先考虑搜索性能
- 合理使用反规范化

## 2. 字段类型选择

| 场景 | 类型 |
|------|------|
| 全文搜索 | text |
| 精确匹配 | keyword |
| 范围查询 | integer/date |
| 地理位置 | geo_point |

## 3. 映射优化

```json
PUT /my-index
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart"
      },
      "status": {
        "type": "keyword"
      },
      "price": {
        "type": "scaled_float",
        "scaling_factor": 100
      }
    }
  }
}
```

## 4. 避免映射爆炸

- 限制字段数量
- 使用 `dynamic: strict`
- 避免动态生成字段名

---
*待补充：更多建模原则*
