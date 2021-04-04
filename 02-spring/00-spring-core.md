<!-- nav-start -->
---

[⬅️ 上一篇：Java 9-17 新特性](../01-java-basic/12-[Java9-17]新特性.md) | [🏠 返回目录](../README.md) | [下一篇：IoC 与 DI ➡️](01-IoC与DI.md)

<!-- nav-end -->

# Spring / Spring Boot 核心原理

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
```

---

## 整体架构

```mermaid
flowchart TB
    subgraph Spring 生态
        SB[Spring Boot<br/>自动配置 / 起步依赖]
        SC[Spring Core<br/>IoC / DI / AOP]
        SM[Spring MVC<br/>Web 请求处理]
        ST[Spring Transaction<br/>事务管理]
        SD[Spring Data<br/>JPA / Redis / MongoDB]
    end
    SB --> SC
    SM --> SC
    ST --> SC
    SD --> SC
    subgraph 底层支撑
        Reflect[Java 反射]
        Proxy[动态代理<br/>JDK / CGLIB]
        ANN[注解处理]
    end
    SC --> Reflect
    SC --> Proxy
    SC --> ANN
```

> Spring Core 是一切的基础，IoC 容器依赖反射创建对象，AOP 依赖动态代理增强功能，Spring Boot 在 Spring 之上通过自动配置简化开发。

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

---

## 高频面试速查

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

---

## 实战性高频面试题

> 以下是面试中容易"卡住"的实战问题，考察对 Spring 原理的真实理解深度。
>
> � 详见：[08-Spring实战应用题.md](./08-Spring实战应用题.md)

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

[⬅️ 上一篇：Java 9-17 新特性](../01-java-basic/12-[Java9-17]新特性.md) | [🏠 返回目录](../README.md) | [下一篇：IoC 与 DI ➡️](01-IoC与DI.md)

<!-- nav-end -->
