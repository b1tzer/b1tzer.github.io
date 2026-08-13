# Elasticsearch 概览

## 1. 什么是 Elasticsearch

Elasticsearch 是基于 Lucene 的分布式搜索和分析引擎，由 Elastic 公司维护。

## 2. 核心能力

| 能力 | 说明 |
|------|------|
| 全文搜索 | 倒排索引，毫秒级响应 |
| 结构化查询 | SQL 类似查询 |
| 聚合分析 | 多维数据分析 |
| 近实时 | 数据写入后 1s 可搜索 |

## 3. 与 Solr/ClickHouse 对比

| 特性 | Elasticsearch | Solr | ClickHouse |
|------|---------------|------|------------|
| 架构 | 分布式 | 主从 | 分布式列存 |
| 全文搜索 | ✅ 极强 | ✅ 强 | ❌ 弱 |
| 聚合分析 | ✅ 强 | ✅ 中 | ✅ 极强 |
| 实时性 | 近实时 | 近实时 | 准实时 |
| 适用场景 | 搜索/日志/分析 | 传统搜索 | OLAP分析 |

## 4. 应用场景

- 全文搜索（电商/内容）
- 日志分析（ELK）
- 应用性能监控（APM）
- 安全分析（SIEM）
- 地理位置搜索

## 5. Elastic Stack

```
Beats → Logstash → Elasticsearch → Kibana
  ↑        ↑            ↑            ↑
  采集     处理         存储/搜索    可视化
```

---
*待补充：更多 ES 基础*
