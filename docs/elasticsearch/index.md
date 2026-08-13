# Elasticsearch 技术体系

系统化的 Elasticsearch 知识体系，从基础概念到分布式原理，从查询优化到 ELK 实战。

## 目录结构

### 01-basics
- [ES 概览](01-basics/chapter-01-overview) — 发展历史、与 Solr/ClickHouse 对比
- [安装部署](01-basics/chapter-02-install-config) — 安装方式、核心配置
- [核心概念](01-basics/chapter-03-core-concepts) — 文档/索引/分片/副本/节点
- [REST API](01-basics/chapter-04-rest-api) — Kibana Dev Tools

### 02-indexing
- [文档 CRUD](02-indexing/chapter-01-document-crud) — 索引/获取/更新/Bulk API
- [映射](02-indexing/chapter-02-mapping) — 动态/显式映射、数据类型
- [分析器](02-indexing/chapter-03-analysis) — 分词器、Token Filter
- [中文分词](02-indexing/chapter-04-chinese-analysis) — IK/jieba
- [索引管理](02-indexing/chapter-05-index-management) — 别名/模板/ILM
- [倒排索引](02-indexing/chapter-06-inverted-index) — Lucene 核心

### 03-search
- [Query DSL](03-search/chapter-01-query-dsl) — 查询语法概览
- [全文搜索](03-search/chapter-02-full-text-search) — match/match_phrase/multi_match
- [精确查询](03-search/chapter-03-term-query) — term/range/exists
- [布尔查询](03-search/chapter-04-bool-query) — must/should/must_not/filter
- [嵌套查询](03-search/chapter-05-joining) — Nested/Parent-Child
- [高亮](03-search/chapter-06-highlight) — 高亮显示
- [分页](03-search/chapter-07-pagination) — from+size/search_after/scroll

### 04-aggregation
- [指标聚合](04-aggregation/chapter-01-metrics-agg) — avg/sum/min/max/stats
- [桶聚合](04-aggregation/chapter-02-bucket-agg) — terms/date_histogram/range
- [管道聚合](04-aggregation/chapter-03-pipeline-agg) — derivative/cumulative_sum
- [聚合优化](04-aggregation/chapter-04-agg-optimization) — 性能优化

### 05-distributed-internals
- [分布式架构](05-distributed-internals/chapter-01-architecture) — 节点角色/Master 选举
- [分片机制](05-distributed-internals/chapter-02-sharding) — 路由、分片分配
- [副本机制](05-distributed-internals/chapter-03-replication) — 同步、故障恢复
- [写入流程](05-distributed-internals/chapter-04-write-path) — Refresh/Flush/Translog
- [读取流程](05-distributed-internals/chapter-05-read-path) — Query/Fetch/DFS
- [近实时搜索](05-distributed-internals/chapter-06-near-real-time)
- [数据一致性](05-distributed-internals/chapter-07-data-consistency)

### 06-data-modeling
- [建模原则](06-data-modeling/chapter-01-modeling-principles) — 字段类型选择
- [Nested vs Join](06-data-modeling/chapter-02-nested-vs-join) — 关系建模
- [反规范化](06-data-modeling/chapter-03-denormalization) — 宽表
- [时序数据](06-data-modeling/chapter-04-time-series) — ILM、冷热架构

### 07-operations
- [集群管理](07-operations/chapter-01-cluster-management) — 节点管理、分片分配
- [监控](07-operations/chapter-02-monitoring) — Prometheus/Grafana
- [备份恢复](07-operations/chapter-03-backup-restore) — Snapshot/Restore
- [安全](07-operations/chapter-04-security) — 认证/授权/SSL
- [版本升级](07-operations/chapter-05-upgrade) — 滚动重启
- [常见问题](07-operations/chapter-06-troubleshooting) — 排查手册

### 08-performance
- [索引优化](08-performance/chapter-01-index-optimization) — 分片数/副本数/刷新间隔
- [查询优化](08-performance/chapter-02-query-optimization) — filter/context/缓存
- [JVM 调优](08-performance/chapter-03-jvm-tuning) — 内存管理
- [硬件选型](08-performance/chapter-04-hardware) — 存储优化

### 09-ecosystem
- [ELK Stack](09-ecosystem/chapter-01-elk) — Elasticsearch+Logstash+Kibana
- [Beats](09-ecosystem/chapter-02-beats) — 数据采集
- [APM](09-ecosystem/chapter-03-apm) — 应用性能监控
- [向量搜索](09-ecosystem/chapter-04-vector-search) — 语义搜索

### 10-practice
- [Spring 集成](10-practice/chapter-01-spring-integration) — Spring Data ES
- [日志分析](10-practice/chapter-02-log-analysis) — ELK 实战
- [搜索引擎](10-practice/chapter-03-search-engine) — 电商搜索
- [数据同步](10-practice/chapter-04-data-sync) — Canal/Debezium
