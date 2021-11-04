# Java Interview Guide

> 🎯 一份系统化的 Java 后端面试知识库，覆盖核心基础、框架原理、数据库、缓存、消息队列、搜索引擎、设计模式与软件工程。

---

## 📚 目录

### ☕ 1、Java Basic

| # | 文章 |
|---|------|
| 00 | [Java 基础知识与 JVM 原理](01-java-basic/00-Java基础与JVM概览.md) |
| 01 | [面向对象（OOP）](01-java-basic/01-面向对象.md) |
| 02 | [集合框架（Collections Framework）](01-java-basic/02-集合框架.md) |
| 03 | [并发编程（Concurrent Programming）](01-java-basic/03-并发编程.md) |
| 04 | [JVM 内存结构与 GC](01-java-basic/04-JVM内存结构与GC.md) |
| 05 | [异常处理（Exception Handling）](01-java-basic/05-异常处理.md) |
| 06 | [AQS 与 CAS](01-java-basic/06-AQS与CAS.md) |
| 07 | [Lambda 表达式](01-java-basic/07-[Java8]Lambda表达式.md) |
| 08 | [Stream API](01-java-basic/08-[Java8]Stream流式编程.md) |
| 09 | [Optional](01-java-basic/09-[Java8]Optional空值处理.md) |
| 10 | [新日期 API](01-java-basic/10-[Java8]新日期API.md) |
| 11 | [接口默认方法与静态方法](01-java-basic/11-[Java8]接口默认方法与静态方法.md) |
| 12 | [Java 9-17 关键新特性](01-java-basic/12-[Java9-17]新特性.md) |
| 13 | [注解（Annotation）](01-java-basic/13-注解（Annotation）.md) |
| 14 | [数据结构精讲（Java & Spring 生态视角）](01-java-basic/14-数据结构精讲.md) |

### 🌱 2、Spring

| # | 文章 |
|---|------|
| 00 | [Spring / Spring Boot 核心原理](02-spring/00-spring-core.md) |
| 01 | [IoC 与 DI —— 控制反转与依赖注入](02-spring/01-IoC与DI.md) |
| 02 | [Bean 生命周期与循环依赖](02-spring/02-Bean生命周期与循环依赖.md) |
| 03 | [AOP —— 面向切面编程](02-spring/03-AOP面向切面编程.md) |
| 04 | [Spring MVC 请求处理流程](02-spring/04-SpringMVC请求处理流程.md) |
| 05 | [Spring Boot 自动配置原理](02-spring/05-SpringBoot自动配置原理.md) |
| 06 | [Spring 事务管理](02-spring/06-Spring事务管理.md) |
| 07 | [Spring 实战应用型面试题](02-spring/07-Spring实战应用题.md) |
| 08 | [Spring Security 认证与授权](02-spring/08-Spring-Security认证与授权.md) |
| 09 | [Spring Cloud 核心组件](02-spring/09-Spring-Cloud核心组件.md) |
| 10 | [Spring 扩展点详解](02-spring/10-Spring扩展点详解.md) |
| 11 | [Spring 常用注解全解](02-spring/11-Spring常用注解全解.md) |
| 12 | [Feign 声明式 HTTP 客户端](02-spring/12-Feign声明式HTTP客户端.md) |
| 13 | [gRPC 详解](02-spring/13-gRPC详解.md) |

### 🗄️ 3、Mysql

| # | 文章 |
|---|------|
| 00 | [MySQL 索引、事务与性能优化](03-mysql/00-mysql-overview.md) |
| 01 | [索引原理与 B+ 树](03-mysql/01-索引原理与B+树.md) |
| 02 | [聚簇索引与覆盖索引](03-mysql/02-聚簇索引与覆盖索引.md) |
| 03 | [联合索引与索引失效](03-mysql/03-联合索引与索引失效.md) |
| 04 | [事务与 ACID](03-mysql/04-事务与ACID.md) |
| 05 | [MVCC 与隔离级别](03-mysql/05-MVCC与隔离级别.md) |
| 06 | [锁机制与死锁](03-mysql/06-锁机制与死锁.md) |
| 07 | [EXPLAIN 与性能优化](03-mysql/07-EXPLAIN与性能优化.md) |
| 08 | [MySQL 实战问题与避坑指南](03-mysql/08-实战问题与避坑指南.md) |

### 🐘 4、Postgresql

| # | 文章 |
|---|------|
| 00 | [PostgreSQL 核心特性与选型](04-postgresql/00-postgresql-overview.md) |
| 01 | [PostgreSQL vs MySQL 全面对比](04-postgresql/01-PG与MySQL对比.md) |
| 02 | [MVCC 原理与表膨胀](04-postgresql/02-MVCC原理与表膨胀.md) |
| 03 | [索引类型详解](04-postgresql/03-索引类型详解.md) |
| 04 | [窗口函数](04-postgresql/04-窗口函数.md) |
| 05 | [CTE 与递归查询](04-postgresql/05-CTE与递归查询.md) |
| 06 | [物化视图](04-postgresql/06-物化视图.md) |
| 07 | [VACUUM 机制](04-postgresql/07-VACUUM机制.md) |

### 🔴 5、Redis

| # | 文章 |
|---|------|
| 00 | [Redis 缓存设计与高可用](05-redis/00-redis-overview.md) |
| 01 | [Redis 数据结构与底层编码](05-redis/01-数据结构与底层编码.md) |
| 02 | [Redis 持久化机制：RDB 与 AOF](05-redis/02-持久化机制RDB与AOF.md) |
| 03 | [Redis 缓存三大问题：穿透、击穿、雪崩](05-redis/03-缓存三大问题.md) |
| 04 | [Redis 高可用架构：主从、哨兵、集群](05-redis/04-高可用架构.md) |
| 05 | [Redis 分布式锁](05-redis/05-分布式锁.md) |
| 06 | [Redis 应用型问题](05-redis/06-应用型问题.md) |

### 📨 6、Kafka

| # | 文章 |
|---|------|
| 01 | [Kafka 基础概念](06-kafka/01-基础概念.md) |
| 02 | [Kafka 整体架构](06-kafka/02-整体架构.md) |
| 03 | [Kafka 消息可靠性：如何保证消息不丢失？](06-kafka/03-消息可靠性.md) |
| 04 | [Kafka 消费者组与 Rebalance](06-kafka/04-消费者组与Rebalance.md) |
| 05 | [Kafka 高吞吐原理](06-kafka/05-高吞吐原理.md) |
| 06 | [消息队列选型对比](06-kafka/06-消息队列选型.md) |
| 07 | [Kafka 工作中常见问题与解决](06-kafka/07-常见问题与解决.md) |
| 08 | [Kafka 面试高频问题（实战详解）](06-kafka/08-面试高频问题.md) |

### 🔍 7、Elasticsearch

| # | 文章 |
|---|------|
| 00 | [Elasticsearch 搜索引擎核心复习](07-elasticsearch/00-elasticsearch概览.md) |
| 01 | [ES 引入：它解决了什么问题？](07-elasticsearch/01-引入与背景.md) |
| 02 | [ES 核心概念：与关系型数据库的对应关系](07-elasticsearch/02-核心概念.md) |
| 03 | [ES 倒排索引：为何擅长全文检索](07-elasticsearch/03-倒排索引.md) |
| 04 | [ES Mapping 设计：字段类型决定查询能力](07-elasticsearch/04-Mapping映射设计.md) |
| 05 | [ES 查询 DSL：核心查询类型](07-elasticsearch/05-查询语法DSL.md) |
| 06 | [ES 集群架构与分片机制](07-elasticsearch/06-集群架构与分片机制.md) |
| 07 | [ES 性能优化](07-elasticsearch/07-性能优化.md) |
| 08 | [ES 数据一致性：MySQL 与 ES 同步方案](07-elasticsearch/08-数据一致性.md) |

### 🏗️ 8、Design Pattern

| # | 文章 |
|---|------|
| 00 | [设计模式总览](08-design-pattern/00-设计模式总览.md) |
| 01 | [单例模式（Singleton Pattern）](08-design-pattern/01-单例模式.md) |
| 02 | [工厂方法模式 & 抽象工厂模式](08-design-pattern/02-工厂方法与抽象工厂模式.md) |
| 03 | [建造者模式（Builder Pattern）](08-design-pattern/03-建造者模式.md) |
| 04 | [代理模式（Proxy Pattern）](08-design-pattern/04-代理模式.md) |
| 05 | [装饰器模式（Decorator Pattern）](08-design-pattern/05-装饰器模式.md) |
| 06 | [适配器模式（Adapter Pattern）](08-design-pattern/06-适配器模式.md) |
| 07 | [策略模式（Strategy Pattern）](08-design-pattern/07-策略模式.md) |
| 08 | [观察者模式（Observer Pattern）](08-design-pattern/08-观察者模式.md) |
| 09 | [模板方法模式（Template Method Pattern）](08-design-pattern/09-模板方法模式.md) |
| 10 | [责任链模式（Chain of Responsibility Pattern）](08-design-pattern/10-责任链模式.md) |

### ⚙️ 9、Software Engineering

| # | 文章 |
|---|------|
| 00 | [软件工程核心知识复习](09-software-engineering/00-软件工程概览.md) |
| 01 | [SOLID 原则](09-software-engineering/01-SOLID原则.md) |
| 02 | [软件架构演进](09-software-engineering/02-软件架构演进.md) |
| 03 | [DDD 领域驱动设计](09-software-engineering/03-DDD领域驱动设计.md) |
| 04 | [CAP 理论与 BASE 理论](09-software-engineering/04-CAP理论与BASE理论.md) |
| 05 | [代码质量与重构](09-software-engineering/05-代码质量与重构.md) |
| 06 | [CI/CD 持续集成与持续交付](09-software-engineering/06-CICD持续集成与交付.md) |
| 07 | [系统设计方法论](09-software-engineering/07-系统设计方法论.md) |

### 📄 10、Project Experience

| # | 文章 |
|---|------|
| 00 | [企业内部问答系统 — 项目概览](10-project-experience/00-项目概览.md) |
| 01 | [问答核心功能设计](10-project-experience/01-问答核心功能设计.md) |
| 02 | [全文搜索系统](10-project-experience/02-全文搜索系统.md) |
| 03 | [计数与热门排行](10-project-experience/03-计数与热门排行.md) |
| 04 | [消息通知系统](10-project-experience/04-消息通知系统.md) |
| 05 | [异步架构设计](10-project-experience/05-异步架构设计.md) |
| 06 | [权限与安全设计](10-project-experience/06-权限与安全设计.md) |
| 07 | [性能优化与踩坑](10-project-experience/07-性能优化与踩坑.md) |

---

## 🗺️ 知识体系总览

```
Java Interview Guide
├── 01-java-basic                       ☕（15 篇）
├── 02-spring                           🌱（14 篇）
├── 03-mysql                            🗄️（9 篇）
├── 04-postgresql                       🐘（8 篇）
├── 05-redis                            🔴（7 篇）
├── 06-kafka                            📨（8 篇）
├── 07-elasticsearch                    🔍（9 篇）
├── 08-design-pattern                   🏗️（11 篇）
├── 09-software-engineering             ⚙️（8 篇）
└── 10-project-experience               📄（8 篇）
```

> 共 **97 篇**文章，每篇文章顶部和底部均有上一篇 / 下一篇导航，支持连续阅读。
