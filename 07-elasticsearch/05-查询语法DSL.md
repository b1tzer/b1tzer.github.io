<!-- nav-start -->

---

[⬅️ 上一篇：ES Mapping 设计：字段类型决定查询能力](04-Mapping映射设计.md) | [🏠 返回目录](../README.md) | [下一篇：ES 集群架构与分片机制 ➡️](06-集群架构与分片机制.md)

<!-- nav-end -->

# ES 查询 DSL：核心查询类型

---

## query context vs filter context

```mermaid
flowchart TD
    subgraph "query context(计算相关性得分)"
        QC["match / multi_match\n全文检索，计算 _score"]
    end

    subgraph "filter context(不计分，可缓存)"
        FC["term / terms\n精确匹配\nrange 范围查询\nexists 字段存在"]
    end

    Bool["bool 查询\n组合查询"] --> Must["must\n必须匹配(影响得分)"]
    Bool --> Should["should\n应该匹配(影响得分)"]
    Bool --> Filter["filter\n过滤(不影响得分，有缓存)"]
    Bool --> MustNot["must_not\n必须不匹配"]

    Must --> QC
    Filter --> FC
```

---

## 为什么 filter 比 must 性能更好

> 1. filter 不计算相关性得分，省去了 TF-IDF/BM25 的计算开销
> 2. filter 结果可以被缓存（Filter Cache），相同过滤条件第二次查询直接走缓存
> 3. 纯过滤场景（如按状态筛选）应优先使用 filter，而非 must

---

## 常用查询示例

```json
// 组合查询：搜索"Java工程师"，价格在10-50之间，状态为上架
{
  "query": {
    "bool": {
      "must": [
        { "match": { "title": "Java工程师" }}   // 全文检索，影响得分
      ],
      "filter": [
        { "range": { "price": { "gte": 10, "lte": 50 }}},  // 范围过滤，不影响得分
        { "term": { "status": "online" }}                   // 精确匹配，不影响得分
      ]
    }
  }
}
```

---

## 面试题：ES 的 query 和 filter 有什么区别？

> - `query`：计算相关性得分（_score），结果不缓存，适合全文检索
> - `filter`：不计算得分，结果可缓存（Filter Cache），性能更高，适合精确过滤
> - 最佳实践：全文检索用 `must`（query context），条件过滤用 `filter`（filter context）

<!-- nav-start -->

---

[⬅️ 上一篇：ES Mapping 设计：字段类型决定查询能力](04-Mapping映射设计.md) | [🏠 返回目录](../README.md) | [下一篇：ES 集群架构与分片机制 ➡️](06-集群架构与分片机制.md)

<!-- nav-end -->
