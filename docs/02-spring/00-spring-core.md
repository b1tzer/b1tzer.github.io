---
title: Spring / Spring Boot 核心原理
---

# Spring / Spring Boot 核心原理

---

## Spring 是什么？

Spring 是 Java 生态中**最主流的企业级应用开发框架**，由 Rod Johnson 于 2003 年创建，核心思想是通过 **IoC（控制反转）** 和 **AOP（面向切面编程）** 解耦应用组件，让开发者专注于业务逻辑而非基础设施。

> 一句话：Spring 是"Java 企业开发的基础设施"，就像盖楼的钢筋框架，业务代码是砖块，Spring 把它们组装在一起。

---

## 发展历程

```mermaid
timeline
    title Spring 发展历程
    2003 : Spring 1.0
         : Rod Johnson 发布
         : 解决 EJB 过重问题
         : IoC 容器 + AOP
    2006 : Spring 2.0
         : XML 配置简化
         : AspectJ 支持
    2009 : Spring 3.0
         : Java 5+ 注解驱动
         : @Configuration
         : REST 支持
    2013 : Spring 4.0
         : Java 8 支持
         : WebSocket
         : Spring Boot 1.0 发布
    2017 : Spring 5.0
         : 响应式编程 WebFlux
         : Kotlin 支持
         : Spring Boot 2.0
    2022 : Spring 6.0
         : 要求 Java 17+
         : GraalVM 原生镜像
         : Spring Boot 3.0
    2024 : Spring Boot 3.3+
         : 虚拟线程支持
         : AOT 编译优化
```

> 📌 **当前主流**：企业新项目普遍使用 **Spring Boot 3.x + Java 17/21**；存量项目多为 Spring Boot 2.x + Java 8/11。

---

## Spring 框架版图

```mermaid
flowchart TB
    subgraph 微服务 / 云原生层
        SCloud["Spring Cloud<br>Eureka · Gateway · Feign · Sentinel · Config"]
        SCloudAlibaba["Spring Cloud Alibaba<br>Nacos · Sentinel · Seata · RocketMQ"]
    end

    subgraph 应用开发层
        SBoot["Spring Boot<br>自动配置 · 起步依赖 · 内嵌容器 · Actuator"]
        SSecurity["Spring Security<br>认证 · 授权 · OAuth2 · JWT"]
    end

    subgraph 数据访问层
        SData["Spring Data<br>JPA · Redis · MongoDB · Elasticsearch"]
        STx["Spring Transaction<br>声明式事务 · 编程式事务"]
    end

    subgraph Web 层
        SMVC["Spring MVC<br>DispatcherServlet · REST · 文件上传"]
        SWebFlux["Spring WebFlux<br>响应式 · Reactor · 非阻塞 IO"]
    end

    subgraph 核心基础层
        SCore["Spring Core<br>IoC 容器 · DI · Bean 生命周期"]
        SAOP["Spring AOP<br>动态代理 · 切面 · 切点"]
    end

    SCloud & SCloudAlibaba --> SBoot
    SBoot --> SSecurity
    SBoot --> SData & STx
    SBoot --> SMVC & SWebFlux
    SSecurity & SData & SMVC & SWebFlux --> SCore & SAOP
```

---

## 知识地图

```mermaid
mindmap
    root((Spring 核心))
        IoC 与 DI
            控制反转思想
            构造器注入
            BeanFactory vs ApplicationContext
        Bean 生命周期
            实例化 → 注入 → Aware → BPP → 初始化 → 销毁
            三级缓存解决循环依赖
        AOP 面向切面
            JDK 动态代理 / CGLIB 代理
            切点表达式
            同类调用失效
        Spring MVC
            DispatcherServlet
            HandlerMapping / HandlerAdapter
        Spring Boot
            自动配置原理
            条件注解
            起步依赖
        事务管理
            传播行为
            隔离级别
            事务失效场景
        Spring Security
            过滤器链
            JWT 认证
        Spring Cloud
            Eureka / Gateway / Feign / Sentinel
        扩展点
            BeanPostProcessor
            BeanFactoryPostProcessor
            ApplicationListener
```

---

## 知识点导航

| # | 知识点 | 核心一句话 | 详细文档 |
|---|--------|-----------|---------|
| 1 | **IoC 与 DI** | IoC 是"容器管对象"，DI 是"容器送依赖"，推荐构造器注入 | [01-IoC与DI.md](./01-核心基础/01-IoC与DI.md) |
| 2 | **Bean 生命周期与循环依赖** | 实例化→注入→Aware→BPP前→初始化→BPP后→使用→销毁；三级缓存解决循环依赖 | [02-Bean生命周期与循环依赖.md](./01-核心基础/02-Bean生命周期与循环依赖.md) |
| 3 | **容器启动流程** | refresh() 12 步：BeanDefinition 加载→BPP 注册→单例实例化→事件发布 | [03-Spring容器启动流程深度解析.md](./01-核心基础/03-Spring容器启动流程深度解析.md) |
| 4 | **Spring 扩展点** | BPP 干预初始化，BFPP 修改 Bean 定义，ApplicationListener 监听事件 | [04-Spring扩展点详解.md](./01-核心基础/04-Spring扩展点详解.md) |
| 5 | **AOP 面向切面** | 基于代理拦截，`this` 调用绕过代理，Spring Boot 2.x 后默认 CGLIB | [05-AOP面向切面编程.md](./01-核心基础/05-AOP面向切面编程.md) |
| 6 | **事务管理** | 事务是 AOP 特例，`this` 调用不生效，异常要抛出，注意传播行为 | [06-Spring事务管理.md](./01-核心基础/06-Spring事务管理.md) |
| 7 | **自动配置原理** | `@EnableAutoConfiguration` 读列表，条件注解按需过滤，允许用户覆盖 | [07-SpringBoot自动配置原理.md](./01-核心基础/07-SpringBoot自动配置原理.md) |
| 8 | **常用注解全解** | `@Conditional`、`@ConfigurationProperties`、`@Profile`、`@Import` 等高频注解 | [08-Spring常用注解全解.md](./01-核心基础/08-Spring常用注解全解.md) |
| 9 | **Spring MVC** | DispatcherServlet 总调度，HandlerMapping 找处理器，HandlerAdapter 适配调用 | [04-SpringMVC请求处理流程.md](./02-Web与通信/04-SpringMVC请求处理流程.md) |
| 10 | **Feign 声明式 HTTP** | 声明式 HTTP 客户端，注解定义接口即可调用远程服务 | [12-Feign声明式HTTP客户端.md](./02-Web与通信/12-Feign声明式HTTP客户端.md) |
| 11 | **gRPC 详解** | 高性能 RPC 框架，基于 Protobuf 序列化 + HTTP/2 传输 | [13-gRPC详解.md](./02-Web与通信/13-gRPC详解.md) |
| 12 | **Spring Security** | 过滤器链拦截请求，JWT 无状态认证，方法级权限控制 | [08-Spring-Security认证与授权.md](./03-微服务与安全/08-Spring-Security认证与授权.md) |
| 13 | **Spring Cloud** | Eureka 服务发现 + Gateway 网关 + Feign 调用 + Sentinel 熔断 | [09-Spring-Cloud核心组件.md](./03-微服务与安全/09-Spring-Cloud核心组件.md) |
| 14 | **微服务架构实践** | 服务拆分、通信、治理、部署的完整微服务落地方案 | [17-微服务架构深度实践.md](./03-微服务与安全/17-微服务架构深度实践.md) |
| 15 | **安全架构深度** | OAuth2、RBAC、ABAC、安全漏洞防护等企业级安全方案 | [21-Spring安全架构深度解析.md](./03-微服务与安全/21-Spring安全架构深度解析.md) |
| 16 | **数据访问高级** | JPA 优化、多数据源、读写分离、MyBatis 高级用法 | [22-Spring数据访问高级技巧.md](./04-数据与消息/22-Spring数据访问高级技巧.md) |
| 17 | **响应式编程** | WebFlux + Reactor，非阻塞 IO，适合高并发低延迟场景 | [23-Spring响应式编程深度解析.md](./04-数据与消息/23-Spring响应式编程深度解析.md) |
| 18 | **消息驱动架构** | Spring Kafka/RabbitMQ 集成，事件驱动、CQRS、Saga 模式 | [24-Spring消息驱动架构深度解析.md](./04-数据与消息/24-Spring消息驱动架构深度解析.md) |
| 19 | **性能优化** | 监控→内存→启动→并发→数据库→缓存→网络，全方位优化指南 | [15a-监控与内存优化.md](./05-进阶与调优/15a-监控与内存优化.md) |
| 20 | **Spring 6 / Boot 3** | Java 17+、Jakarta EE、GraalVM Native Image、虚拟线程、AOT 编译 | [16-Spring6-Boot3新特性深度解析.md](./05-进阶与调优/16-Spring6-Boot3新特性深度解析.md) |
| 21 | **源码阅读技巧** | 从入口到核心，掌握 Spring 源码阅读与调试的方法论 | [18-Spring源码阅读与调试技巧.md](./05-进阶与调优/18-Spring源码阅读与调试技巧.md) |
| 22 | **生产环境运维** | Actuator 监控、日志管理、优雅停机、灰度发布等运维实践 | [19-生产环境Spring应用运维.md](./05-进阶与调优/19-生产环境Spring应用运维.md) |
| 23 | **测试框架** | 单元测试、集成测试、MockMvc、TestContainers 等测试最佳实践 | [20-Spring测试框架深度使用.md](./06-测试与实战/20-Spring测试框架深度使用.md) |
| 24 | **实战应用题** | 事务排查、长事务优化、AOP失效、Bean泄漏等 12 道实战题 | [07-Spring实战应用题.md](./06-测试与实战/07-Spring实战应用题.md) |

---

## 高频问题索引

| 问题 | 详见 |
|------|------|
| IoC 和 DI 的区别？BeanFactory vs ApplicationContext？ | [IoC与DI](./01-核心基础/01-IoC与DI.md) |
| Bean 单例线程安全吗？循环依赖如何解决？ | [Bean生命周期与循环依赖](./01-核心基础/02-Bean生命周期与循环依赖.md) |
| AOP 不生效怎么排查？为什么默认用 CGLIB？ | [AOP面向切面编程](./01-核心基础/05-AOP面向切面编程.md) |
| 事务不回滚的原因？REQUIRED vs REQUIRES_NEW？ | [Spring事务管理](./01-核心基础/06-Spring事务管理.md) |
| 自动配置原理？如何自定义 Starter？ | [SpringBoot自动配置原理](./01-核心基础/07-SpringBoot自动配置原理.md) |
| 认证和授权的区别？JWT vs Session？ | [Spring-Security认证与授权](./03-微服务与安全/08-Spring-Security认证与授权.md) |
| Eureka 自我保护是什么？服务雪崩如何防止？ | [Spring-Cloud核心组件](./03-微服务与安全/09-Spring-Cloud核心组件.md) |
| 线上 OOM / Bean 泄漏怎么排查？ | [Spring实战应用题](./06-测试与实战/07-Spring实战应用题.md) |
