# Java Interview Guide

> 🎯 一份系统化的 Java 后端面试知识库，覆盖核心基础、框架原理、数据库、缓存、消息队列、搜索引擎、设计模式与软件工程。

---

## 📚 目录

### ☕ 一、Java 基础与 JVM

| # | 文章 |
|---|------|
| 00 | [Java 基础与 JVM 概览](01-java-basic/00-Java基础与JVM概览.md) |
| 01 | [面向对象（OOP）](01-java-basic/01-面向对象.md) |
| 02 | [集合框架](01-java-basic/02-集合框架.md) |
| 03 | [并发编程](01-java-basic/03-并发编程.md) |
| 04 | [JVM 内存结构与 GC](01-java-basic/04-JVM内存结构与GC.md) |
| 05 | [异常处理](01-java-basic/05-异常处理.md) |
| 06 | [AQS 与 CAS](01-java-basic/06-AQS与CAS.md) |
| 07 | [Lambda 表达式](01-java-basic/07-[Java8]Lambda表达式.md) |
| 08 | [Stream 流式编程](01-java-basic/08-[Java8]Stream流式编程.md) |
| 09 | [Optional 空值处理](01-java-basic/09-[Java8]Optional空值处理.md) |
| 10 | [新日期 API](01-java-basic/10-[Java8]新日期API.md) |
| 11 | [接口默认方法与静态方法](01-java-basic/11-[Java8]接口默认方法与静态方法.md) |
| 12 | [Java 9-17 新特性](01-java-basic/12-[Java9-17]新特性.md) |

---

### 🌱 二、Spring 全家桶

| # | 文章 |
|---|------|
| 00 | [Spring 核心概览](02-spring/00-spring-core.md) |
| 01 | [IoC 与 DI](02-spring/01-IoC与DI.md) |
| 02 | [Bean 生命周期](02-spring/02-Bean生命周期.md) |
| 03 | [AOP 面向切面编程](02-spring/03-AOP面向切面编程.md) |
| 04 | [SpringMVC 请求处理流程](02-spring/04-SpringMVC请求处理流程.md) |
| 05 | [SpringBoot 自动配置原理](02-spring/05-SpringBoot自动配置原理.md) |
| 06 | [Spring 事务管理](02-spring/06-Spring事务管理.md) |
| 07 | [循环依赖与三级缓存](02-spring/07-循环依赖与三级缓存.md) |
| 08 | [Spring 实战应用题](02-spring/08-Spring实战应用题.md) |

---

### 🗄️ 三、MySQL

| # | 文章 |
|---|------|
| 00 | [MySQL 概览](03-mysql/00-mysql-overview.md) |
| 01 | [索引原理与 B+ 树](03-mysql/01-索引原理与B+树.md) |
| 02 | [聚簇索引与覆盖索引](03-mysql/02-聚簇索引与覆盖索引.md) |
| 03 | [联合索引与索引失效](03-mysql/03-联合索引与索引失效.md) |
| 04 | [事务与 ACID](03-mysql/04-事务与ACID.md) |
| 05 | [MVCC 与隔离级别](03-mysql/05-MVCC与隔离级别.md) |
| 06 | [锁机制与死锁](03-mysql/06-锁机制与死锁.md) |
| 07 | [EXPLAIN 与性能优化](03-mysql/07-EXPLAIN与性能优化.md) |
| 08 | [实战问题与避坑指南](03-mysql/08-实战问题与避坑指南.md) |

---

### 🐘 四、PostgreSQL

| # | 文章 |
|---|------|
| 00 | [PostgreSQL 概览](04-postgresql/00-postgresql-overview.md) |
| 01 | [PG 与 MySQL 对比](04-postgresql/01-PG与MySQL对比.md) |
| 02 | [MVCC 原理与表膨胀](04-postgresql/02-MVCC原理与表膨胀.md) |
| 03 | [索引类型详解](04-postgresql/03-索引类型详解.md) |
| 04 | [窗口函数](04-postgresql/04-窗口函数.md) |
| 05 | [CTE 与递归查询](04-postgresql/05-CTE与递归查询.md) |
| 06 | [物化视图](04-postgresql/06-物化视图.md) |
| 07 | [VACUUM 机制](04-postgresql/07-VACUUM机制.md) |

---

### 🔴 五、Redis

| # | 文章 |
|---|------|
| 00 | [Redis 概览](05-redis/00-redis-overview.md) |
| 01 | [数据结构与底层编码](05-redis/01-数据结构与底层编码.md) |
| 02 | [持久化机制 RDB 与 AOF](05-redis/02-持久化机制RDB与AOF.md) |
| 03 | [缓存三大问题](05-redis/03-缓存三大问题.md) |
| 04 | [高可用架构](05-redis/04-高可用架构.md) |
| 05 | [分布式锁](05-redis/05-分布式锁.md) |
| 06 | [应用型问题](05-redis/06-应用型问题.md) |

---

### 📨 六、Kafka

| # | 文章 |
|---|------|
| 01 | [基础概念](06-kafka/01-基础概念.md) |
| 02 | [整体架构](06-kafka/02-整体架构.md) |
| 03 | [消息可靠性](06-kafka/03-消息可靠性.md) |
| 04 | [消费者组与 Rebalance](06-kafka/04-消费者组与Rebalance.md) |
| 05 | [高吞吐原理](06-kafka/05-高吞吐原理.md) |
| 06 | [消息队列选型](06-kafka/06-消息队列选型.md) |
| 07 | [常见问题与解决](06-kafka/07-常见问题与解决.md) |
| 08 | [面试高频问题](06-kafka/08-面试高频问题.md) |

---

### 🔍 七、Elasticsearch

| # | 文章 |
|---|------|
| 00 | [Elasticsearch 概览](07-elasticsearch/00-elasticsearch概览.md) |
| 01 | [引入与背景](07-elasticsearch/01-引入与背景.md) |
| 02 | [核心概念](07-elasticsearch/02-核心概念.md) |
| 03 | [倒排索引](07-elasticsearch/03-倒排索引.md) |
| 04 | [Mapping 映射设计](07-elasticsearch/04-Mapping映射设计.md) |
| 05 | [查询语法 DSL](07-elasticsearch/05-查询语法DSL.md) |
| 06 | [集群架构与分片机制](07-elasticsearch/06-集群架构与分片机制.md) |
| 07 | [性能优化](07-elasticsearch/07-性能优化.md) |
| 08 | [数据一致性](07-elasticsearch/08-数据一致性.md) |

---

### 🏗️ 八、设计模式

| # | 文章 |
|---|------|
| 00 | [设计模式总览](08-design-pattern/00-设计模式总览.md) |
| 01 | [单例模式](08-design-pattern/01-单例模式.md) |
| 02 | [工厂方法与抽象工厂模式](08-design-pattern/02-工厂方法与抽象工厂模式.md) |
| 03 | [建造者模式](08-design-pattern/03-建造者模式.md) |
| 04 | [代理模式](08-design-pattern/04-代理模式.md) |
| 05 | [装饰器模式](08-design-pattern/05-装饰器模式.md) |
| 06 | [适配器模式](08-design-pattern/06-适配器模式.md) |
| 07 | [策略模式](08-design-pattern/07-策略模式.md) |
| 08 | [观察者模式](08-design-pattern/08-观察者模式.md) |
| 09 | [模板方法模式](08-design-pattern/09-模板方法模式.md) |
| 10 | [责任链模式](08-design-pattern/10-责任链模式.md) |

---

### ⚙️ 九、软件工程

| # | 文章 |
|---|------|
| 00 | [软件工程概览](09-software-engineering/00-软件工程概览.md) |
| 01 | [SOLID 原则](09-software-engineering/01-SOLID原则.md) |
| 02 | [软件架构演进](09-software-engineering/02-软件架构演进.md) |
| 03 | [DDD 领域驱动设计](09-software-engineering/03-DDD领域驱动设计.md) |
| 04 | [CAP 理论与 BASE 理论](09-software-engineering/04-CAP理论与BASE理论.md) |
| 05 | [代码质量与重构](09-software-engineering/05-代码质量与重构.md) |
| 06 | [CI/CD 持续集成与交付](09-software-engineering/06-CICD持续集成与交付.md) |
| 07 | [系统设计方法论](09-software-engineering/07-系统设计方法论.md) |

---

## 🗺️ 知识体系总览

```
Java Interview Guide
├── 01-java-basic        ☕ Java 基础与 JVM（13 篇）
├── 02-spring            🌱 Spring 全家桶（9 篇）
├── 03-mysql             🗄️ MySQL（9 篇）
├── 04-postgresql        🐘 PostgreSQL（8 篇）
├── 05-redis             🔴 Redis（7 篇）
├── 06-kafka             📨 Kafka（8 篇）
├── 07-elasticsearch     🔍 Elasticsearch（9 篇）
├── 08-design-pattern    🏗️ 设计模式（11 篇）
└── 09-software-engineering  ⚙️ 软件工程（8 篇）
```

> 共 **82 篇**文章，每篇文章底部均有上一篇 / 下一篇导航，支持连续阅读。
