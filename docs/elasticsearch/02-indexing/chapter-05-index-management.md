# 索引生命周期管理

## 1. 索引别名

```json
# 创建别名
POST /_aliases
{
  "actions": [
    { "add": { "index": "my-index-v1", "alias": "my-index" } }
  ]
}

# 切换别名（零停机）
POST /_aliases
{
  "actions": [
    { "remove": { "index": "my-index-v1", "alias": "my-index" } },
    { "add": { "index": "my-index-v2", "alias": "my-index" } }
  ]
}
```

## 2. 索引模板

```json
PUT /_index_template/my-template
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1
    },
    "mappings": {
      "properties": {
        "timestamp": { "type": "date" },
        "message": { "type": "text" }
      }
    }
  }
}
```

## 3. ILM (Index Lifecycle Management)

```json
PUT /_ilm/policy/my-policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": { "max_size": "50GB", "max_age": "1d" }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": { "delete": {} }
      }
    }
  }
}
```

---
*待补充：更多索引管理*
