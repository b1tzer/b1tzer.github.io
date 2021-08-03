<!-- nav-start -->

---

[⬅️ 上一篇：Java 9-17 关键新特性](../01-java-basic/12-[Java9-17]新特性.md) | [🏠 返回目录](../README.md) | [下一篇：IoC 与 DI —— 控制反转与依赖注入 ➡️](01-IoC与DI.md)

<!-- nav-end -->

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

### 关键版本节点

| 版本 | 时间 | 核心变化 | 最低 Java 要求 |
|------|------|---------|--------------|
| Spring 3.x | 2009 | 注解驱动开发成熟，`@Configuration`、`@ComponentScan` | Java 5 |
| Spring 4.x | 2013 | Java 8 支持，条件注解 `@Conditional` | Java 6 |
| **Spring Boot 1.x** | **2014** | **自动配置革命，约定优于配置，内嵌 Tomcat** | Java 6 |
| Spring 5.x | 2017 | 响应式编程 WebFlux，Reactor 模型 | Java 8 |
| **Spring Boot 2.x** | **2018** | **Spring 5 + 默认 CGLIB + Actuator 增强** | Java 8 |
| Spring 6.x | 2022 | Jakarta EE 9+，GraalVM 原生镜像支持 | **Java 17** |
| **Spring Boot 3.x** | **2022** | **Spring 6 + 虚拟线程 + AOT 编译** | **Java 17** |

> 📌 **当前主流**：企业新项目普遍使用 **Spring Boot 3.x + Java 17/21**；存量项目多为 Spring Boot 2.x + Java 8/11。

---

## Spring 框架版图

```mermaid
flowchart TB
    subgraph 微服务 / 云原生层
        SCloud["Spring Cloud\nEureka · Gateway · Feign · Sentinel · Config"]
        SCloudAlibaba["Spring Cloud Alibaba\nNacos · Sentinel · Seata · RocketMQ"]
    end

    subgraph 应用开发层
        SBoot["Spring Boot\n自动配置 · 起步依赖 · 内嵌容器 · Actuator"]
        SSecurity["Spring Security\n认证 · 授权 · OAuth2 · JWT"]
        SBatch["Spring Batch\n批处理 · Job · Step · ItemReader"]
        SIntegration["Spring Integration\n企业集成模式 · 消息通道"]
    end

    subgraph 数据访问层
        SData["Spring Data\nJPA · Redis · MongoDB · Elasticsearch"]
        STx["Spring Transaction\n声明式事务 · 编程式事务"]
    end

    subgraph Web 层
        SMVC["Spring MVC\nDispatcherServlet · REST · 文件上传"]
        SWebFlux["Spring WebFlux\n响应式 · Reactor · 非阻塞 IO"]
    end

    subgraph 核心基础层
        SCore["Spring Core\nIoC 容器 · DI · Bean 生命周期"]
        SAOP["Spring AOP\n动态代理 · 切面 · 切点"]
        SContext["Spring Context\nApplicationContext · 事件 · 国际化"]
    end

    SCloud & SCloudAlibaba --> SBoot
    SBoot --> SSecurity & SBatch & SIntegration
    SBoot --> SData & STx
    SBoot --> SMVC & SWebFlux
    SSecurity & SBatch & SData & SMVC & SWebFlux --> SCore & SAOP & SContext
```

### 各模块定位速查

| 模块 | 定位 | 典型使用场景 |
|------|------|------------|
| **Spring Core** | IoC 容器，所有模块的基础 | Bean 管理、依赖注入 |
| **Spring AOP** | 面向切面，基于动态代理 | 日志、事务、权限切面 |
| **Spring MVC** | Web 层，处理 HTTP 请求 | RESTful API 开发 |
| **Spring WebFlux** | 响应式 Web，非阻塞 IO | 高并发、流式数据处理 |
| **Spring Boot** | 自动配置，简化开发 | 所有 Spring 项目的启动器 |
| **Spring Data** | 数据访问统一抽象 | JPA、Redis、MongoDB 操作 |
| **Spring Security** | 安全框架，认证与授权 | 登录、权限控制、OAuth2 |
| **Spring Batch** | 批处理框架 | 大数据量定时任务、ETL |
| **Spring Cloud** | 微服务基础设施 | 服务注册、网关、熔断 |
| **Spring Cloud Alibaba** | 阿里巴巴微服务套件 | Nacos、Sentinel、Seata |

---

## 为什么要学 Spring 原理？

不理解原理会导致的**线上问题**：

- `@Transactional` 加了但事务不回滚（同类调用绕过代理）
- AOP 切面不生效（`this.method()` 绕过代理对象）
- 循环依赖报错，不知道为什么构造器注入会失败
- 自动配置不生效，不知道如何 debug

---

## 知识地图

```mermaid
mindmap
    root((Spring 核心))
        IoC 与 DI
            控制反转思想
            构造器注入
            字段注入
            BeanFactory vs ApplicationContext
        Bean 生命周期
            实例化
            依赖注入
            Aware 回调
            BeanPostProcessor
            初始化与销毁
        AOP 面向切面
            JDK 动态代理
            CGLIB 代理
            切点表达式
            同类调用失效
        Spring MVC
            DispatcherServlet
            HandlerMapping
            HandlerAdapter
            视图解析
        Spring Boot
            自动配置原理
            条件注解
            起步依赖
        事务管理
            传播行为
            隔离级别
            事务失效场景
        循环依赖
            三级缓存
            构造器注入限制
        Spring Security
            过滤器链
            JWT 认证
            方法级权限
        Spring Cloud
            Eureka 注册中心
            Gateway 网关
            Feign 调用
            Sentinel 熔断
        扩展点
            BeanPostProcessor
            BeanFactoryPostProcessor
            ApplicationListener
        常用注解
            @Conditional
            @ConfigurationProperties
            @Profile
            @Import
```

---

## 整体架构

```mermaid
flowchart TB
    subgraph Spring Cloud 微服务层
        SGW[Gateway 网关<br/>路由 / 鉴权 / 限流]
        SEU[Eureka / Nacos<br/>服务注册与发现]
        SFG[Feign<br/>声明式调用]
        SST[Sentinel<br/>熔断降级]
    end
    subgraph Spring 应用层
        SB[Spring Boot<br/>自动配置 / 起步依赖]
        SSC[Spring Security<br/>认证 / 授权 / JWT]
        SM[Spring MVC<br/>Web 请求处理]
        ST[Spring Transaction<br/>事务管理]
        SD[Spring Data<br/>JPA / Redis / MongoDB]
    end
    subgraph Spring 核心层
        SC[Spring Core<br/>IoC / DI / AOP]
    end
    subgraph 底层支撑
        Reflect[Java 反射]
        Proxy[动态代理<br/>JDK / CGLIB]
        ANN[注解处理]
    end
    SGW & SEU & SFG & SST --> SB
    SB --> SSC & SM & ST & SD
    SSC & SM & ST & SD --> SC
    SC --> Reflect & Proxy & ANN
```

> Spring Core 是一切的基础，IoC 容器依赖反射创建对象，AOP 依赖动态代理增强功能，Spring Boot 在 Spring 之上通过自动配置简化开发，Spring Cloud 在 Spring Boot 之上构建微服务体系。

---

## 知识点导航

| # | 知识点 | 核心一句话 | 详细文档 |
|---|--------|-----------|---------|
| 1 | **IoC 与 DI** | IoC 是"容器管对象"，DI 是"容器送依赖"，推荐构造器注入 | [01-IoC与DI.md](./01-IoC与DI.md) |
| 2 | **Bean 生命周期** | 实例化→注入→Aware→BPP前→初始化→BPP后（AOP代理）→使用→销毁 | [02-Bean生命周期.md](./02-Bean生命周期.md) |
| 3 | **AOP 面向切面** | 基于代理拦截，`this` 调用绕过代理，Spring Boot 2.x 后默认 CGLIB | [03-AOP面向切面编程.md](./03-AOP面向切面编程.md) |
| 4 | **Spring MVC** | DispatcherServlet 总调度，HandlerMapping 找处理器，HandlerAdapter 适配调用 | [04-SpringMVC请求处理流程.md](./04-SpringMVC请求处理流程.md) |
| 5 | **自动配置原理** | `@EnableAutoConfiguration` 读列表，条件注解按需过滤，允许用户覆盖 | [05-SpringBoot自动配置原理.md](./05-SpringBoot自动配置原理.md) |
| 6 | **事务管理** | 事务是 AOP 特例，`this` 调用不生效，异常要抛出，注意传播行为 | [06-Spring事务管理.md](./06-Spring事务管理.md) |
| 7 | **循环依赖** | 三级缓存提前暴露半成品，构造器注入无法提前暴露所以不能解决 | [07-循环依赖与三级缓存.md](./07-循环依赖与三级缓存.md) |
| 8 | **实战应用题** | 事务排查、长事务优化、AOP失效、Bean泄漏、动态注册等 12 道实战题 | [08-Spring实战应用题.md](./08-Spring实战应用题.md) |
| 9 | **Spring Security** | 过滤器链拦截请求，JWT 无状态认证，方法级 `@PreAuthorize` 权限控制 | [09-Spring-Security认证与授权.md](./09-Spring-Security认证与授权.md) |
| 10 | **Spring Cloud** | Eureka 服务发现 + Gateway 网关 + Feign 调用 + Sentinel 熔断，微服务必备 | [10-Spring-Cloud核心组件.md](./10-Spring-Cloud核心组件.md) |
| 11 | **Spring 扩展点** | BPP 干预初始化，BFPP 修改 Bean 定义，ApplicationListener 监听事件 | [11-Spring扩展点详解.md](./11-Spring扩展点详解.md) |
| 12 | **常用注解全解** | `@Conditional`、`@ConfigurationProperties`、`@Profile`、`@Import` 等高频注解 | [12-Spring常用注解全解.md](./12-Spring常用注解全解.md) |

---

## 高频面试速查

### 核心原理

| 问题 | 关键答案 |
|------|---------|
| IoC 和 DI 的区别？ | IoC 是设计思想（控制权交给容器），DI 是具体实现方式（容器注入依赖） |
| BeanFactory vs ApplicationContext？ | BeanFactory 懒加载，功能基础；ApplicationContext 预加载单例，扩展了国际化/事件/AOP |
| Bean 单例线程安全吗？ | 不一定，有可变成员变量就不安全；用 `ThreadLocal` 或改为 `prototype` 解决 |
| @Autowired vs @Resource？ | `@Autowired` 按类型注入（Spring）；`@Resource` 先按名称注入（JDK） |
| AOP 不生效怎么排查？ | ① `this` 同类调用 ② 方法非 public ③ 类未被 Spring 管理 ④ 切点表达式错误 |
| 事务不回滚的原因？ | ① 同类调用 ② 异常被捕获未抛出 ③ 非 RuntimeException 未加 `rollbackFor` ④ 方法非 public |
| 为什么默认用 CGLIB？ | JDK 代理要求实现接口，大量 Service 没有接口；CGLIB 生成子类无需接口，覆盖面更广 |
| 循环依赖如何解决？ | 三级缓存提前暴露 `ObjectFactory`，支持 AOP 代理；构造器注入无法提前暴露，需用 `@Lazy` |

### Security / Cloud / 扩展点

| 问题 | 关键答案 |
|------|---------|
| 认证和授权的区别？ | 认证（Authentication）验证"你是谁"；授权（Authorization）验证"你能做什么" |
| JWT 和 Session 的区别？ | Session 有状态，服务端存储，分布式需共享；JWT 无状态，信息在 Token 中，天然支持分布式 |
| JWT Token 如何主动失效？ | Redis 黑名单（退出时写入 Token，TTL = 剩余有效期）；或 Token 版本号机制 |
| Eureka 自我保护是什么？ | 短时间内大量心跳丢失时，停止剔除服务实例，防止网络抖动误删健康服务 |
| 服务雪崩如何防止？ | 超时快速失败 + 熔断（错误率超阈值直接降级）+ 限流（控制入口流量）+ 隔离（独立线程池） |
| BeanPostProcessor 和 BeanFactoryPostProcessor 的区别？ | BFPP 在 Bean 实例化前修改 BeanDefinition；BPP 在 Bean 初始化前后处理 Bean 对象（AOP 代理在这里生成） |
| @ConditionalOnMissingBean 的作用？ | 容器中不存在指定 Bean 时才注册，是 Spring Boot 自动配置"用户优先"原则的核心 |
| @Configuration 和 @Component 的区别？ | `@Configuration` 中的 `@Bean` 方法被 CGLIB 代理，方法间调用走容器保证单例；`@Component` 不代理，方法间调用是普通 Java 调用 |

---

## 常见问题速查

| 问题现象 | 根本原因 | 解决方案 |
|---------|---------|---------|
| `@Autowired` 注入为 null | 对象不是 Spring 管理的（手动 new） | 改用 `@Component` + 注入方式获取 |
| 事务不回滚 | 异常被捕获 / 非 RuntimeException / 同类调用 | 重新抛出异常，加 `rollbackFor`，避免同类调用 |
| AOP 切面不生效 | `this` 同类调用绕过代理 | 注入自身代理或重构代码 |
| 循环依赖报错 | 构造器注入无法提前暴露引用 | 改为字段注入，或加 `@Lazy`，或重构解耦 |
| 自动配置不生效 | 条件注解不满足（缺少依赖 / 已有自定义 Bean） | 检查类路径依赖，用 `--debug` 查看自动配置报告 |
| `@PostConstruct` 中 NPE | 在构造器中使用了 `@Autowired` 字段 | 将初始化逻辑移到 `@PostConstruct` 方法中 |
| JWT Token 失效后仍能访问 | Token 无法主动撤销，服务端只验证签名 | Redis 黑名单 + 退出时写入，或缩短有效期 |
| Feign 调用超时报错 | 默认超时时间过短 / 下游服务响应慢 | 配置合理超时时间，加 Fallback 降级处理 |
| Gateway 过滤器不生效 | 过滤器 Order 优先级设置错误 | 检查 `getOrder()` 返回值，数字越小优先级越高 |
| `@Profile` 配置不生效 | `spring.profiles.active` 未正确设置 | 检查启动参数或 `application.yml` 中的 active 配置 |

---

## 实战性高频面试题

> 以下是面试中容易"卡住"的实战问题，考察对 Spring 原理的真实理解深度。
>
> 📄 详见：[08-Spring实战应用题.md](./08-Spring实战应用题.md)

### 题目速览

| # | 题目 | 考察方向 |
|---|------|--------|
| Q1 | `@Transactional` 不回滚怎么排查？ | 事务失效场景 |
| Q2 | `REQUIRED` vs `REQUIRES_NEW` 怎么选？ | 事务传播行为 |
| Q3 | 长事务有什么危害？如何优化？ | 事务性能 |
| Q4 | AOP 切面不生效怎么排查？ | AOP 代理机制 |
| Q5 | JDK 代理 vs CGLIB 区别？ | 代理原理 |
| Q6 | Bean 初始化几种方式的执行顺序？ | Bean 生命周期 |
| Q7 | `BeanPostProcessor` 有什么用？ | Spring 扩展点 |
| Q8 | Spring Boot 启动慢怎么排查优化？ | 性能调优 |
| Q9 | 如何自定义 Spring Boot Starter？ | 框架扩展 |
| Q10 | 三级缓存分别存什么？为什么需要第三级？ | 循环依赖原理 |
| Q11 | 线上 OOM 发现 Bean 泄漏，原因有哪些？ | 内存问题排查 |
| Q12 | 如何运行时动态注册 Bean？ | 容器扩展 |

---

### 🔥 事务相关（节选）

**Q1：`@Transactional` 加了，但数据库没有回滚，你怎么排查？**

排查思路（按优先级）：
1. **同类调用**：`this.methodA()` 调用同类的 `@Transactional` 方法，绕过代理，事务不生效
2. **异常被吞**：方法内部 `try-catch` 捕获了异常但没有重新抛出
3. **异常类型不对**：默认只回滚 `RuntimeException`，受检异常需加 `rollbackFor = Exception.class`
4. **方法非 public**：Spring AOP 只拦截 public 方法
5. **数据库引擎不支持事务**：MySQL 的 MyISAM 引擎不支持事务，需用 InnoDB
6. **多数据源问题**：事务管理器和数据源不匹配

> 📄 完整解析及代码示例见：[08-Spring实战应用题.md](./08-Spring实战应用题.md)

<!-- nav-start -->

---

[⬅️ 上一篇：Java 9-17 关键新特性](../01-java-basic/12-[Java9-17]新特性.md) | [🏠 返回目录](../README.md) | [下一篇：IoC 与 DI —— 控制反转与依赖注入 ➡️](01-IoC与DI.md)

<!-- nav-end -->
