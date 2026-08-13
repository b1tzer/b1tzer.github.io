# 软件工程知识体系

系统化的软件工程知识体系，从设计原则到架构模式，从 DDD 到系统设计。

## 目录结构

### 01-principles
- [软件工程概览](01-principles/chapter-01-overview) — 目标、开发模型、核心价值观
- [SOLID 原则](01-principles/chapter-02-solid) — 单一职责/开闭/里氏/接口隔离/依赖倒置
- [其他原则](01-principles/chapter-03-other-principles) — DRY/KISS/YAGNI/LoD
- [代码坏味道](01-principles/chapter-04-code-smells) — 反模式识别
- [重构](01-principles/chapter-05-refactoring) — 重构技术、重构到模式

### 02-design-patterns
- [创建型](02-design-patterns/chapter-01-creational) — 工厂/单例/建造者/原型
- [结构型](02-design-patterns/chapter-02-structural) — 代理/适配器/装饰器/外观
- [行为型](02-design-patterns/chapter-03-behavioral) — 策略/观察者/模板方法/责任链
- [模式实践](02-design-patterns/chapter-04-pattern-practice) — 模式选型

### 03-architecture
- [架构风格](03-architecture/chapter-01-architecture-styles) — 分层/微内核/事件驱动
- [整洁架构](03-architecture/chapter-02-clean-architecture) — 六边形/洋葱架构
- [微服务](03-architecture/chapter-03-microservices) — 服务拆分
- [单体架构](03-architecture/chapter-04-monolith) — 模块化单体
- [事件驱动](03-architecture/chapter-05-event-driven) — CQRS/ES
- [架构决策](03-architecture/chapter-06-architecture-decision) — ADR

### 04-ddd
- [DDD 概览](04-ddd/chapter-01-ddd-overview) — 战略设计/战术设计
- [限界上下文](04-ddd/chapter-02-bounded-context) — 上下文映射
- [战术设计](04-ddd/chapter-03-tactical-design) — 实体/值对象/聚合根
- [领域事件](04-ddd/chapter-04-domain-events)
- [DDD 实战](04-ddd/chapter-05-ddd-practice) — 事件风暴

### 05-system-design
- [设计方法论](05-system-design/chapter-01-design-methodology) — 需求/概要/详细设计
- [高并发](05-system-design/chapter-02-high-concurrency) — 缓存/异步/限流/熔断
- [高可用](05-system-design/chapter-03-high-availability) — 冗余/故障转移/幂等
- [高性能](05-system-design/chapter-04-high-performance) — 索引/缓存/CDN
- [可扩展](05-system-design/chapter-05-scalability) — 分库分表/读写分离
- [分布式理论](05-system-design/chapter-06-distributed-theory) — CAP/BASE

### 06-engineering-practices
- [Git 工作流](06-engineering-practices/chapter-01-git-workflow) — GitFlow/Trunk-based
- [Code Review](06-engineering-practices/chapter-02-code-review)
- [测试](06-engineering-practices/chapter-03-testing) — 单元/集成/端到端
- [CI/CD](06-engineering-practices/chapter-04-cicd)
- [DevOps](06-engineering-practices/chapter-05-devops) — GitOps
- [可观测性](06-engineering-practices/chapter-06-observability) — 日志/指标/链路追踪

### 07-security
- [安全概览](07-security/chapter-01-security-overview) — OWASP Top 10
- [认证](07-security/chapter-02-authentication) — Session/JWT/OAuth2
- [授权](07-security/chapter-03-authorization) — RBAC/ABAC
- [常见攻击](07-security/chapter-04-common-attacks) — XSS/SQL注入/CSRF
- [安全实践](07-security/chapter-05-security-practice) — 安全编码

### 08-project-management
- [敏捷](08-project-management/chapter-01-agile) — Scrum/Kanban
- [需求分析](08-project-management/chapter-02-requirements) — 用户故事
- [估算](08-project-management/chapter-03-estimation)
- [技术债务](08-project-management/chapter-04-technical-debt)

### 09-practice
- [API 设计](09-practice/chapter-01-api-design) — RESTful/GraphQL
- [数据建模](09-practice/chapter-02-data-modeling)
- [性能调优](09-practice/chapter-03-performance-tuning)
- [案例分析](09-practice/chapter-04-case-studies)
