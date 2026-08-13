# 分析器

## 1. 分析器组成

```
Character Filter → Tokenizer → Token Filter
     ↓               ↓            ↓
  字符过滤         分词         词元过滤
```

## 2. 内置分析器

| 分析器 | 说明 |
|--------|------|
| standard | 默认，按单词分词 |
| simple | 按非字母字符分词 |
| whitespace | 按空格分词 |
| keyword | 不分词 |
| pattern | 正则分词 |

## 3. 自定义分析器

```json
PUT /my-index
{
  "settings": {
    "analysis": {
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "my_stop"]
        }
      },
      "filter": {
        "my_stop": {
          "type": "stop",
          "stopwords": ["的", "了", "是"]
        }
      }
    }
  }
}
```

## 4. 测试分析器

```json
POST /_analyze
{
  "analyzer": "my_analyzer",
  "text": "Elasticsearch 是一个分布式搜索引擎"
}
```

---
*待补充：更多分析器细节*
