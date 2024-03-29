---
title: Java 基础知识与 JVM 原理
---

# Java 基础知识与 JVM 原理

> **学习目标**：从"会用"升级到"理解原理 → 能解决问题 → 能做技术决策"
>
> **检验标准**：学完每个模块后，能口述"这个技术解决了什么问题？不用它会怎样？工作中有哪些坑？"

---

## 整体知识地图

```mermaid
mindmap
    root((Java 基础))
        面向对象
            封装 / 继承 / 多态 / 抽象
            接口 vs 抽象类
            设计原则入门
        集合框架
            List: ArrayList / LinkedList
            Map: HashMap / TreeMap / LinkedHashMap
            Set: HashSet / TreeSet
            并发集合: ConcurrentHashMap
        并发编程
            线程生命周期
            synchronized / volatile
            ThreadLocal
            线程池 ThreadPoolExecutor
            AQS / ReentrantLock
        JVM
            内存分区
            GC 算法
            G1 vs CMS
            OOM 排查
        异常处理
            Checked vs Unchecked
            最佳实践
        Java 8 新特性
            Lambda 表达式
            Stream 流式编程
            Optional 空值处理
            新日期 API
            接口默认方法
        泛型与注解
            泛型擦除与边界
            元注解与自定义注解
        数据结构
            红黑树 / B+树 / 跳表
            布隆过滤器
```

---

## 知识点导航

| # | 知识点 | 核心一句话 | 详细文档 |
|---|--------|-----------|---------|
| 01 | **面向对象** | 封装隐藏实现、继承复用代码、多态解耦调用方、抽象定义规范 | [01-面向对象.md](./01-面向对象.md) |
| 02 | **集合框架** | ArrayList 随机访问快、LinkedList 增删快、HashMap 数组+链表+红黑树、ConcurrentHashMap 线程安全 | [02-集合框架.md](./02-集合框架.md) |
| 03 | **并发编程** | synchronized 保证原子性+可见性、volatile 保证可见性+有序性、线程池避免频繁创建销毁线程 | [03-并发编程.md](./03-并发编程.md) |
| 04 | **JVM 内存结构与 GC** | 堆存对象、栈存帧、元空间存类信息；GC 分代收集，G1 是 JDK9+ 默认收集器 | [04-JVM内存结构与GC.md](./04-JVM内存结构与GC.md) |
| 05 | **异常处理** | Checked 编译器强制处理、Unchecked 编程错误应修复代码；禁止空 catch 块 | [05-异常处理.md](./05-异常处理.md) |
| 06 | **AQS 与 CAS** | AQS 是并发包核心框架，CAS 是无锁编程基础；ReentrantLock 比 synchronized 更灵活 | [06-AQS与CAS.md](./06-AQS与CAS.md) |
| 07 | **Lambda 表达式** | 函数式编程基础，简化匿名内部类写法，配合函数式接口使用 | [07-Lambda表达式.md](./07-Lambda表达式.md) |
| 08 | **Stream 流式编程** | 声明式数据处理管道，支持并行流，惰性求值提升性能 | [08-Stream流式编程.md](./08-Stream流式编程.md) |
| 09 | **Optional 空值处理** | 优雅处理 null，避免 NullPointerException，链式调用替代 if-null 判断 | [09-Optional空值处理.md](./09-Optional空值处理.md) |
| 10 | **新日期 API** | LocalDate/LocalTime/LocalDateTime 不可变线程安全，替代 Date/Calendar | [10-新日期API.md](./10-新日期API.md) |
| 11 | **接口默认方法与静态方法** | Java 8 接口可包含默认实现，解决接口演进的兼容性问题 | [11-接口默认方法与静态方法.md](./11-接口默认方法与静态方法.md) |
| 12 | **泛型** | 编译期类型检查，运行时类型擦除；通配符 `? extends` 读、`? super` 写 | [12-泛型.md](./12-泛型.md) |
| 13 | **注解** | 元注解定义注解行为，自定义注解 + 反射/APT 实现框架功能 | [13-注解.md](./13-注解.md) |
| 14 | **数据结构精讲** | 红黑树自平衡 O(log n)、B+树磁盘友好、跳表概率平衡、布隆过滤器判存在 | [14-数据结构精讲.md](./14-数据结构精讲.md) |

---

## 高频问题索引

| 问题 | 详见 |
|------|------|
| 面向对象四大特性分别解决什么问题？ | [面向对象](./01-面向对象.md) |
| HashMap 扩容流程？JDK7 头插法为什么会死循环？ | [集合框架](./02-集合框架.md) |
| synchronized 和 volatile 的区别？ | [并发编程](./03-并发编程.md) |
| 线程池核心参数怎么设置？为什么不用 Executors？ | [并发编程](./03-并发编程.md) |
| ThreadLocal 为什么会内存泄漏？ | [并发编程](./03-并发编程.md) |
| JVM 内存分区有哪些？各自存什么？ | [JVM 内存结构与 GC](./04-JVM内存结构与GC.md) |
| G1 和 CMS 的区别？ | [JVM 内存结构与 GC](./04-JVM内存结构与GC.md) |
| OOM 问题如何排查？ | [JVM 内存结构与 GC](./04-JVM内存结构与GC.md) |
| 双重检查锁的单例为什么需要 volatile？ | [AQS 与 CAS](./06-AQS与CAS.md) |
| AQS 等待队列原理？ReentrantLock vs synchronized？ | [AQS 与 CAS](./06-AQS与CAS.md) |
| CAS 的 ABA 问题如何解决？ | [AQS 与 CAS](./06-AQS与CAS.md) |

---

## 学习路径建议

```mermaid
flowchart TD
    A[面向对象基础] --> B[集合框架原理]
    B --> C["并发编程基础<br>synchronized / volatile"]
    C --> D[线程池深入]
    D --> E[AQS / ReentrantLock]
    E --> F[JVM 内存模型]
    F --> G[GC 算法与调优]
    G --> H[Java 8 新特性]
    H --> I[泛型与注解]
```

> **推荐实践**：
> 1. 手写一个线程安全的单例（双重检查锁 + volatile）
> 2. 用 `jvisualvm` 模拟一次内存泄漏并排查
> 3. 配置一个自定义线程池，测试各种拒绝策略的行为