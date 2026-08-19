# Spring 核心原理概览

> 你写的 `@Service` 里没有一个 `new`，依赖却都能用；你写的 `@Transactional` 方法里没有一行事务代码，异常却能回滚。前者靠 IoC 容器替你创建对象，后者靠 AOP 替你包一层代理。Spring 的一切上层能力——Boot 的自动配置、Cloud 的服务治理——都长在这两件事上。本专题只讲这两块地基。

## 1. 版本演进

Spring 从 2002 年 Rod Johnson 的一本书萌芽，到 2022 年 Spring 6.0 全面转向 JDK 17：

![Spring 生态演进](/spring/spring-core-timeline.svg)

架构从单体演进到微服务，Spring Boot 简化配置，Spring Cloud 补上服务治理。但无论形态怎么变，IoC 和 AOP 始终是地基，不随架构变化失效。这是本专题只聚焦核心容器与 AOP 的原因。

## 2. 框架版图

Spring 的容器不是一整块，而是分层叠加：`spring-core` 提供底层工具，`spring-beans` 管 Bean 的定义与装配，`spring-context` 再补出 `ApplicationContext`、事件和国际化。AOP、事务、Web 都建立在这两层之上——一个 `@Service` 能同时被代理、被事务切面拦截，靠的是它们共享这一套 Bean 装配：

![Spring 核心模块依赖关系](/spring/spring-core-modules.svg)

## 3. 知识地图

![Spring 核心知识地图](/spring/spring-core-mindmap.svg)

## 4. 知识点导航

| 知识点 | 要解决的问题 | 详见 |
| :-- | :-- | :-- |
| IoC 容器 | 对象由谁创建、何时创建 | [IoC 容器](./chapter-02-ioc-container.md) |
| 依赖注入 | 三种注入方式怎么选 | [依赖注入](./chapter-03-dependency-injection.md) |
| 循环依赖与三级缓存 | 相互依赖的 Bean 怎么解开 | [循环依赖与三级缓存](./chapter-04-bean-lifecycle.md) |
| AOP | 横切逻辑怎么复用 | [AOP](./chapter-05-aop.md) |
| 条件装配 | 按条件决定 Bean 是否生效 | [条件装配与 Profile](./chapter-06-conditional-profile.md) |

## 5. 高频问题索引

| 问题 | 详见 |
| :-- | :-- |
| IoC 和 DI 有什么区别？ | [IoC 容器](./chapter-02-ioc-container.md) |
| `BeanFactory` 和 `ApplicationContext` 怎么选？ | [IoC 容器](./chapter-02-ioc-container.md) |
| 构造器注入为什么比字段注入好？ | [依赖注入](./chapter-03-dependency-injection.md) |
| 循环依赖是怎么解的？构造器注入为什么解不了？ | [循环依赖与三级缓存](./chapter-04-bean-lifecycle.md) |
| 加了 AOP 后循环依赖为什么可能代理失效？ | [循环依赖与三级缓存](./chapter-04-bean-lifecycle.md) |
| AOP 为什么有时不生效？ | [AOP](./chapter-05-aop.md) |
| 条件装配怎么实现「用户优先」？ | [条件装配与 Profile](./chapter-06-conditional-profile.md) |

## 6. 阅读顺序

1. 先读 [IoC 容器](./chapter-02-ioc-container.md) 和 [AOP](./chapter-05-aop.md)，建立两个核心概念的直觉。
2. 再读 [循环依赖与三级缓存](./chapter-04-bean-lifecycle.md)，理解循环依赖的解法与 AOP 代理冲突。
3. 最后读 [依赖注入](./chapter-03-dependency-injection.md) 和 [条件装配](./chapter-06-conditional-profile.md)，解决工程选型问题。
