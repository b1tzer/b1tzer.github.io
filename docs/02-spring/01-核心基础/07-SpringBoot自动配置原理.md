---
doc_id: spring-核心基础-SpringBoot自动配置原理
title: Spring Boot 自动配置原理
---

# Spring Boot 自动配置原理

> **一句话记忆**：自动配置 = 一张 `.imports` 清单 + 一堆 `@ConditionalOnXxx` 过滤器 + `DeferredImportSelector` 让位用户 Bean。

> 📖 **边界声明**：本文聚焦"Spring Boot 自动配置的**源码机制**"，即 `AutoConfigurationImportSelector` 如何读取配置列表、如何在 `DeferredImportSelector` 时机延迟求值、`@ConditionalOnMissingBean` 为何能让位用户 Bean。以下主题请见对应专题：
>
> - **条件注解 `@ConditionalOnXxx` 的完整语义、使用示例、Q&A** → [Spring常用注解全解](@spring-核心基础-Spring常用注解全解)
> - **`spring.factories` → `.imports` 的完整迁移矩阵、Boot 2.7 过渡期、升级踩坑** → [Spring容器启动流程深度解析](@spring-核心基础-Spring容器启动流程深度解析)
> - **如何自定义一个 Spring Boot Starter（完整工程示例：目录结构 + `.imports` + 打包）** → [Spring实战应用题](@spring-测试与实战-Spring实战应用题)
> - **`BeanFactoryPostProcessor` / `ImportSelector` 等扩展点的全景对比** → [Spring扩展点详解](@spring-核心基础-Spring扩展点详解)

---

## 1. 类比：自动配置就像智能家居管家

想象你搬进一套精装修的智能公寓（引入 Spring Boot 依赖），公寓管家（自动配置系统）会：

1. **自动检测**：管家扫描房间，发现你有空调、冰箱、洗衣机（检测类路径上的依赖）
2. **智能配置**：根据你的设备自动设置默认模式（空调 26°C、冰箱 4°C、洗衣机标准模式）
3. **用户优先**：如果你手动调了温度，管家就不再干预（自定义配置优先）
4. **延迟决策**：管家等你把所有家具摆好，再决定要不要启动设备（延迟求值）

### 生活场景 vs 技术实现

| 生活场景 | 技术实现 | 为什么这样设计 |
| :-- | :-- | :-- |
| **扫描房间有什么设备** | `@ConditionalOnClass` 检查类路径 | 避免为不存在的依赖配置 Bean |
| **等你摆好家具再决定** | `DeferredImportSelector` 延迟执行 | 保证你的自定义配置优先 |
| **你没设置我才帮忙** | `@ConditionalOnMissingBean` 条件判断 | 防止重复配置冲突 |
| **按你的偏好设置** | `@ConditionalOnProperty` 读取配置 | 支持个性化定制 |
| **管家手里的设备清单** | `.imports` 文件中的 130+ 自动配置类 | 知道能自动配置哪些组件 |


---

## 2. 为什么需要自动配置：从 XML 到零配置

要理解自动配置解决什么痛点，先看"没有它的日子"。搭建一个最简单的"Web + JDBC"应用，三个时代的配置量对比：

**① Spring 2.x 时代（XML 配置）——一个空架子就 300+ 行 XML：**

```xml
<!-- applicationContext.xml 典型片段 -->
<bean id="dataSource" class="org.apache.commons.dbcp2.BasicDataSource">
    <property name="driverClassName" value="com.mysql.cj.jdbc.Driver"/>
    <property name="url" value="jdbc:mysql://localhost:3306/demo"/>
    <property name="username" value="root"/>
    <property name="password" value="123456"/>
    <property name="initialSize" value="5"/>
    <property name="maxTotal" value="20"/>
</bean>

<bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
    <property name="dataSource" ref="dataSource"/>
</bean>

<bean id="jdbcTemplate" class="org.springframework.jdbc.core.JdbcTemplate">
    <property name="dataSource" ref="dataSource"/>
</bean>

<!-- 还要配 DispatcherServlet、ViewResolver、MultipartResolver、MessageConverter... -->
<!-- 外加 web.xml 里 DispatcherServlet 的 servlet-mapping、context-param、listener 等数十行 -->
```

**② Spring 3.x 时代（Java Config）——从 XML 搬到 `@Configuration` 类，体量减半但仍要自己写：**

```java
@Configuration
@EnableWebMvc
public class AppConfig {
    @Bean
    public DataSource dataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:mysql://localhost:3306/demo");
        ds.setUsername("root");
        ds.setPassword("123456");
        ds.setMaximumPoolSize(20);
        return ds;
    }
    
    @Bean
    public JdbcTemplate jdbcTemplate(DataSource ds) {
        return new JdbcTemplate(ds);
    }
    
    // 还要配置事务管理器、DispatcherServlet、ViewResolver 等...
}
```

**Spring Boot（自动配置）**
```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-jdbc</artifactId>
</dependency>
```

```properties
# application.properties
spring.datasource.url=jdbc:mysql://localhost:3306/demo
spring.datasource.username=root
spring.datasource.password=123456
```

自动配置帮你做了什么？**130+ 个 `@AutoConfiguration` 类**按条件注解精确命中当前类路径和配置文件状态，自动注册 `DataSource` / `JdbcTemplate` / `TransactionManager` / `DispatcherServlet` / `ViewResolver` / `MultipartResolver` 等 Bean。

> 📌 **一句话**：自动配置不是魔法，它只是把"你以前自己写的 `@Configuration` 类"打包到了框架 jar 里，再用条件注解决定"此时此刻要不要激活它"。

---

## 3. 核心概念：自动配置的 6 个关键角色

理解自动配置就像看一场戏，需要认识几个关键角色：

| 角色 | 扮演者 | 职责 | 生活化比喻 |
| :-- | :-- | :-- | :-- |
| **清单管理员** | `SpringFactoriesLoader` | 读取设备清单（`.imports` 文件） | 管家手里的设备清单 |
| **总导演** | `AutoConfigurationImportSelector` | 协调整个自动配置流程 | 智能家居系统总控 |
| **延迟决策者** | `DeferredImportSelector` | 等你摆好家具再决定启动设备 | 管家等你安顿好再行动 |
| **配置标签** | `@AutoConfiguration` | 标记自动配置类（Boot 3+） | 设备上的"智能配置"标签 |
| **快速筛选器** | `AutoConfigurationImportFilter` | 批量检查哪些设备可用 | 管家快速扫描可用设备 |
| **条件判断器** | `SpringBootCondition` | 判断是否满足启动条件 | 管家判断是否要启动设备 |

这些角色在自动配置的"演出流程"中各有分工，下面我们看它们如何配合。

## 4. 执行流程：自动配置的 5 步工作流

自动配置就像一场精心编排的演出，分为 5 个关键步骤：

```mermaid
flowchart LR
    A["① 扫描设备清单<br>读取 .imports 文件<br>130+ 候选配置类"] --> B["② 快速筛选<br>批量检查哪些设备可用<br>避免加载无用类"]
    B --> C["③ 等待用户配置<br>延迟到所有用户<br>@Configuration 解析完"]
    C --> D["④ 精细判断<br>逐个检查条件注解<br>决定是否激活"]
    D --> E["⑤ 注册 Bean<br>幸存的配置类<br>当作普通 @Configuration 解析"]
```

!!! note "📖 术语家族：`*Selector` / `*Registrar`（类名贡献者家族）"
    **字面义**：`Import` = 导入，`Selector` = 选择器 / 挑选者——"被 `@Import` 导入时，负责挑出一批类名交给容器"。
    **在 Spring 中的含义**：介于"写死的 `@Import(Xxx.class)`"与"程序化 `BeanDefinitionRegistry` 注册"之间的中间层——让框架能在 `@Configuration` 解析阶段**动态决定**要把哪些配置类纳入容器，是自动配置、`@EnableXxx` 家族、Spring Cloud 的 `@EnableFeignClients` 等"开关式装配"的共同技术底座。
    **同家族成员**：

    | 成员 | 返回物 | 求值时机 | 典型用途 | 源码位置 |
    | :-- | :-- | :-- | :-- | :-- |
    | `ImportSelector` | `String[]`（类名数组） | 与 `@Configuration` 解析**同批**求值 | `@EnableCaching` / `@EnableAsync` 这类"开关 + 固定配置集"场景 | `org.springframework.context.annotation.ImportSelector` |
    | `DeferredImportSelector` | `String[]`（类名数组） | **所有 `@Configuration` 解析完**后延迟求值，可声明内部 `Group` 批处理 | 需要等用户 Bean 登记完再决定的场景（自动配置唯一选它） | `org.springframework.context.annotation.DeferredImportSelector` |
    | `AutoConfigurationImportSelector` | `String[]` + `AutoConfigurationEntry`（带 exclusions） | 继承 `DeferredImportSelector`，Spring Boot 专用 | `@EnableAutoConfiguration` 的真正干活者 | `org.springframework.boot.autoconfigure.AutoConfigurationImportSelector` |
    | `ImportBeanDefinitionRegistrar` | **void**（直接往 `BeanDefinitionRegistry` 注册） | 与 `ImportSelector` 同批 | 需要精细控制 `BeanDefinition`（scope / primary / 别名）的场景，如 `@MapperScan` | `org.springframework.context.annotation.ImportBeanDefinitionRegistrar` |

    **命名规律**：
    - `<Xxx>Selector` = "我返回**一串类名**给你，由你当作 `@Configuration` 去解析"——轻量，不碰 `BeanDefinition`
    - `Deferred<Xxx>Selector` = "同上，但**延迟到最后**执行"——让位给用户配置
    - `<Xxx>Registrar` = "我直接上手改 `BeanDefinitionRegistry`"——重量，绕过 `@Configuration` 解析
    - 三者都要被 `@Import` 引入才会被激活；只有 `DeferredImportSelector` 的 `Group` 能跨多个 `@Import` 聚合批处理

关键差异：`ImportSelector` 和 `@Configuration` 类一起求值；`DeferredImportSelector` **等所有 `@Configuration` 处理完才求值**——这一点就是自动配置"用户优先"的技术根基（详见 §7）。

**接口继承图 B：`Condition` 家族**

```mermaid
flowchart TB
    C["Condition<br>(Spring 原生)<br>matches(ctx, meta): boolean"]
    SBC["SpringBootCondition<br>(Boot 抽象基类)<br>模板方法 getMatchOutcome()"]
    FSBC["FilteringSpringBootCondition<br>(Boot 批量过滤基类)<br>实现 AutoConfigurationImportFilter"]
    OCC["OnClassCondition"]
    OBC["OnBeanCondition"]
    OPC["OnPropertyCondition"]
    OWAC["OnWebApplicationCondition"]

    C --> SBC
    SBC --> FSBC
    FSBC --> OCC
    FSBC --> OBC
    SBC --> OPC
    SBC --> OWAC

    style C fill:#e8f5e9
    style SBC fill:#fff3e0
    style FSBC fill:#ffebee
```

为什么 `OnClassCondition` / `OnBeanCondition` 要继承 `FilteringSpringBootCondition`？因为它们要在"130+ 自动配置类"这个量级上**批量过滤**——详见 §5 的源码链路。

---

## 4. 自动装配在 Spring Bean 创建流程中的位置

### 4.1 完整流程图：从容器启动到 Bean 创建

Spring Boot 自动配置是 Spring 容器启动流程中的一个**关键环节**，它发生在 Bean 定义注册阶段，但在 Bean 实例化之前。下面是完整的执行链路：

```mermaid
flowchart TD
    A["① SpringApplication.run()<br>容器启动入口"] --> B["② 创建 ApplicationContext<br>AnnotationConfigApplicationContext"]
    B --> C["③ 扫描 @Configuration 类<br>ConfigurationClassPostProcessor"]
    C --> D["④ 解析 @Import 注解<br>包括 @EnableAutoConfiguration"]
    D --> E["⑤ AutoConfigurationImportSelector<br>执行自动配置流程"]
    E --> F["⑥ 注册自动配置的 Bean 定义<br>到 BeanDefinitionRegistry"]
    F --> G["⑦ BeanFactoryPostProcessor<br>处理 Bean 定义后置逻辑"]
    G --> H["⑧ Bean 实例化阶段<br>调用构造函数"]
    H --> I["⑨ Bean 初始化阶段<br>@PostConstruct、InitializingBean"]
    I --> J["⑩ Bean 就绪<br>可用状态"]
    
    %% 自动配置的关键位置
    E --> E1["扫描 .imports 文件<br>130+ 候选配置类"]
    E1 --> E2["条件注解批量过滤<br>@ConditionalOnClass/Bean/Property"]
    E2 --> E3["DeferredImportSelector 延迟<br>保证用户配置优先"]
    E3 --> E4["注册合格的配置类<br>作为 @Configuration 处理"]
```

### 4.2 关键定位：自动配置的时机与作用

#### 时机：Bean 定义注册阶段

自动配置发生在 **ConfigurationClassPostProcessor** 处理 `@Configuration` 类时，具体在：

```java
// ConfigurationClassPostProcessor.java
public void processConfigBeanDefinitions(BeanDefinitionRegistry registry) {
    // 1. 解析所有 @Configuration 类
    ConfigurationClassParser parser = new ConfigurationClassParser(...);
    parser.parse(candidates);
    
    // 2. 处理 @Import 注解（包括 @EnableAutoConfiguration）
    parser.validate();
    
    // 3. 注册 Bean 定义
    this.reader.loadBeanDefinitions(configClasses);
}
```

**所以"自动配置是怎么工作的"这个问题，等价于"`AutoConfigurationImportSelector` 里发生了什么"**——这就是下一节的全部内容。

#### 作用：扩展 Bean 定义注册

自动配置的核心作用是**扩展 BeanDefinitionRegistry**，在用户配置的基础上**补充**最佳实践的 Bean 定义：

| 阶段 | 注册内容 | 优先级 |
| :-- | :-- | :-- |
| **用户配置** | `@Configuration` 类中的 `@Bean` 方法 | 高 |
| **自动配置** | `.imports` 文件中符合条件的配置类 | 中 |
| **组件扫描** | `@ComponentScan` 发现的组件 | 低 |

### 4.3 与 Bean 生命周期的关系

自动配置**只负责 Bean 定义的注册**，不参与 Bean 的实例化和初始化：

```mermaid
flowchart LR
    A["Bean 定义注册<br>（自动配置在此）"] --> B["Bean 实例化<br>（调用构造函数）"]
    B --> C["依赖注入<br>（@Autowired/@Resource）"]
    C --> D["Bean 初始化<br>（@PostConstruct）"]
    C --> E["Aware 接口回调<br>（BeanNameAware 等）"]
    D --> F["Bean 就绪<br>（可用状态）"]
```

#### 关键区别

- **自动配置阶段**：决定**要不要**创建某个 Bean（Bean 定义级别）
- **Bean 生命周期**：决定**如何**创建和初始化 Bean（实例级别）

### 4.4 源码中的关键类和方法

#### 入口类：ConfigurationClassPostProcessor

```java
// ConfigurationClassPostProcessor.java
public class ConfigurationClassPostProcessor implements BeanDefinitionRegistryPostProcessor {
    
    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
        // 这是自动配置的入口点
        processConfigBeanDefinitions(registry);
    }
    
    private void processConfigBeanDefinitions(BeanDefinitionRegistry registry) {
        // 解析所有配置类，包括自动配置类
        ConfigurationClassParser parser = new ConfigurationClassParser(...);
        Set<ConfigurationClass> configClasses = parser.parse(candidates);
        
        // 注册 Bean 定义
        this.reader.loadBeanDefinitions(configClasses);
    }
}
```

#### 自动配置选择器：AutoConfigurationImportSelector

```java
// AutoConfigurationImportSelector.java
public class AutoConfigurationImportSelector implements DeferredImportSelector {
    
    @Override
    public String[] selectImports(AnnotationMetadata annotationMetadata) {
        // 返回要导入的自动配置类
        AutoConfigurationEntry autoConfigurationEntry = 
            getAutoConfigurationEntry(annotationMetadata);
        return StringUtils.toStringArray(autoConfigurationEntry.getConfigurations());
    }
    
    protected AutoConfigurationEntry getAutoConfigurationEntry(AnnotationMetadata metadata) {
        // 1. 获取候选配置类
        List<String> configurations = getCandidateConfigurations(metadata, attributes);
        
        // 2. 去重和过滤
        configurations = removeDuplicates(configurations);
        configurations = filter(configurations, autoConfigurationMetadata);
        
        // 3. 触发事件
        fireAutoConfigurationImportEvents(configurations, exclusions);
        
        return new AutoConfigurationEntry(configurations, exclusions);
    }
}
```

### 4.5 总结：自动配置的定位

**一句话定位**：自动配置是 Spring 容器启动流程中 **Bean 定义注册阶段**的一个**智能扩展机制**，它通过条件注解在用户配置的基础上**补充**最佳实践的 Bean 定义，但**不参与**后续的 Bean 实例化和初始化过程。

**关键特性**：

- **时机**：ConfigurationClassPostProcessor 处理阶段
- **作用**：扩展 BeanDefinitionRegistry
- **优先级**：用户配置 > 自动配置 > 组件扫描
- **范围**：只负责 Bean 定义，不涉及 Bean 实例化

---

## 5. 源码链路：从 selectImports() 到 Bean 注册 ⭐

自动配置的全链路可以压缩成 5 个方法调用。理解了这 5 步，所有"为什么生效/为什么失效"的问题都能自己回答。

```mermaid
flowchart LR
    S1["① selectImports()<br>入口，返回类名数组"]
    S2["② getAutoConfigurationEntry()<br>编排全流程"]
    S3["③ getCandidateConfigurations()<br>读 .imports 文件<br>拿到 130+ 候选类"]
    S4["④ removeDuplicates() +<br>getConfigurationClassFilter().filter()<br>去重 + 批量过滤"]
    S5["⑤ fireAutoConfigurationImportEvents()<br>广播事件，供 Actuator 做条件评估报告"]
    S6[["ConfigurationClassPostProcessor<br>把幸存的类当作 @Configuration 解析<br>→ 注册 Bean"]]

    S1 --> S2 --> S3 --> S4 --> S5 --> S6

    style S1 fill:#e3f2fd
    style S3 fill:#fff3e0
    style S4 fill:#ffebee
    style S6 fill:#e8f5e9
```

### 5.1 第 ①②③ 步：入口与候选清单加载

`AutoConfigurationImportSelector` 实现的是 `DeferredImportSelector`，真正的入口不是 `selectImports()` 而是它的内部 `Group` 类（`AutoConfigurationGroup`），但对外语义一致：**返回一个要交给 `@Configuration` 解析器处理的类名数组**。核心方法签名：

| 方法 | 职责 | 关键源码动作 |
| :-- | :-- | :-- |
| `selectImports(AnnotationMetadata)` | 对外入口 | 委托给 `getAutoConfigurationEntry()` |
| `getAutoConfigurationEntry(AnnotationMetadata)` | 编排全流程 | 串联 ③→④→⑤ 五个子步骤 |
| `getCandidateConfigurations(...)` | 加载候选清单 | Boot 3：`ImportCandidates.load(AutoConfiguration.class, cl)`；Boot 2：`SpringFactoriesLoader.loadFactoryNames(EnableAutoConfiguration.class, cl)` |

第 ③ 步加载完，手里就有一份 **130+ 个全限定类名**的原始清单（实际数量随版本与引入的 starter 浮动）。此时**还没做任何条件判断**——清单里包含"当前项目根本没用 Kafka，但 Kafka 自动配置类名"。

### 5.2 第 ④ 步：批量过滤（性能关键）

如果顺序跑 130+ 个类的 `@Conditional` 求值，启动会慢得肉眼可见。Boot 的做法是**先批量过滤，再精细求值**：

```java
// AutoConfigurationImportSelector#getConfigurationClassFilter() 返回一个过滤器链
// 链上每一环都是一个 AutoConfigurationImportFilter 实现，目前官方提供 3 个：
//   - OnClassCondition             批量检查类路径是否存在
//   - OnBeanCondition              批量检查容器内是否已有 Bean
//   - OnWebApplicationCondition    批量检查是否 Web 环境
```

`OnClassCondition` 的实现细节值得单独拎出来——它是启动性能的核心：

| 技巧 | 实现 |
| :-- | :-- |
| **字符串形式的类名声明** | `@ConditionalOnClass(name="...")` 使用字符串，避免 JVM 在加载注解元数据时触发目标类的静态初始化 |
| **`ClassLoader.loadClass()` + catch `Throwable`** | 检查类存在性时即便出现 `NoClassDefFoundError` 也能安全返回 false，而不是让启动直接崩 |
| **多线程并行检查** | 大项目里 `OnClassCondition` 会拆分任务到多个线程并行跑 |

经过 ④ 的过滤，130+ 通常会缩到 **20~40 个真正要激活的类**。

### 5.3 第 ⑤ 步：事件广播与最终注册

过滤后剩下的类会经由 `fireAutoConfigurationImportEvents()` 广播 `AutoConfigurationImportEvent`，这是 Actuator `/actuator/conditions` 端点数据的来源。随后这批类名被返回给上游的 `ConfigurationClassParser`，被当作**普通 `@Configuration` 类**解析——于是 `@Bean` 方法被发现、求值、注册为 Bean。

!!! warning "Boot 3 停止读取 spring.factories 的 EnableAutoConfiguration 键"
    Boot 2 的 `getCandidateConfigurations()` 读的是 `META-INF/spring.factories` 里的 `EnableAutoConfiguration=...` 键值对；**Boot 3 起该键不再被读取**，必须改用 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 文件（一行一个类名，纯文本）。老 Starter 升级到 Boot 3 时最典型的症状就是"自动配置类一个都不加载"——根因就在这里。完整迁移方案见 §8 及 [Spring容器启动流程深度解析](@spring-核心基础-Spring容器启动流程深度解析) 的"SPI 与 .imports 机制"章节。

---

## 6. 条件注解在自动配置链路上的速查

本节**只讲"条件注解在自动配置链路的哪一步触发、对应哪个 `Condition` 实现类"**，注解本身的完整语义和使用示例请看姊妹篇。

| 注解 | 在 §5 的哪一步触发 | 对应 `Condition` 实现 |
| :-- | :-- | :-- |
| `@ConditionalOnClass` | ④ 批量过滤阶段（`OnClassCondition`） | `OnClassCondition extends FilteringSpringBootCondition` |
| `@ConditionalOnMissingBean` | ④ 批量过滤阶段（`OnBeanCondition`） | `OnBeanCondition extends FilteringSpringBootCondition` |
| `@ConditionalOnWebApplication` | ④ 批量过滤阶段 | `OnWebApplicationCondition extends SpringBootCondition` |
| `@ConditionalOnProperty` | 精细求值阶段（每个类上逐个求值） | `OnPropertyCondition extends SpringBootCondition` |

> 📖 上述条件注解的**完整语义、参数列表、使用示例、Q&A**，详见 [Spring常用注解全解 · 条件装配系列](@spring-核心基础-Spring常用注解全解)。本文不再展开。

---

## 7. @ConditionalOnMissingBean 让位机制深度解析

这是整个自动配置体系**最重要的一个设计**——"用户 Bean 优先于自动配置 Bean"。它能工作的根本原因，不在 `@ConditionalOnMissingBean` 本身，而在 `DeferredImportSelector` 的延迟求值时序。

### 7.1 问题：普通 ImportSelector 为什么做不到？

假设 `AutoConfigurationImportSelector` 只是普通 `ImportSelector`，执行时序会是这样：

```mermaid
flowchart TD
    A["ConfigurationClassPostProcessor 开始处理 @Configuration 类"]
    A --> B["遇到 @SpringBootApplication 启动类<br>→ 立即执行 AutoConfigurationImportSelector"]
    B --> C["此时用户的 MyDataSourceConfig<br>还没被解析！"]
    C --> D["@ConditionalOnMissingBean(DataSource.class)<br>检查容器 → 不存在 → 注册默认 DataSource"]
    D --> E["然后才解析用户的 MyDataSourceConfig<br>→ 再注册一个 DataSource<br>→ 两个 DataSource 冲突 💥"]

    style C fill:#ffebee
    style E fill:#ffebee
```

### 7.2 DeferredImportSelector 的救赎

`AutoConfigurationImportSelector implements DeferredImportSelector`，这个"延迟"两个字改变了时序：

```mermaid
flowchart TD
    A["ConfigurationClassPostProcessor 开始处理"]
    A --> B["处理所有普通 @Configuration 类<br>（含用户的 MyDataSourceConfig）"]
    B --> C["用户的 DataSource Bean 定义<br>已登记在 BeanDefinitionRegistry"]
    C --> D["所有普通类处理完，才执行<br>DeferredImportSelector.Group"]
    D --> E["@ConditionalOnMissingBean(DataSource.class)<br>检查 → 已存在 → 跳过默认 DataSource ✅"]

    style C fill:#e8f5e9
    style E fill:#e8f5e9
```

### 7.3 一个容易踩的边界

`@ConditionalOnMissingBean` 检查的是 **`BeanDefinitionRegistry`**（Bean 定义注册表），不是 **`BeanFactory` 中已实例化的单例**。这意味着：

- ✅ 用户在 `@Configuration` 类里用 `@Bean` 声明过 `DataSource` → 检查通过（已登记）
- ❌ 用户通过 `BeanFactoryPostProcessor` 在自动配置**之后**手动 `registerBeanDefinition()` → 检查不到（时序已过）
- ⚠️ 用户在另一个自动配置类里用 `@Bean` 声明 `DataSource`，且两个自动配置类通过 `@AutoConfigureBefore/After` 有依赖关系 → 需要 `AutoConfigurationSorter` 先排序，才能保证先到的那个登记 Bean 定义（详见 §9 坑 ②）

---

## 8. Spring Boot 2.x → 3.x 自动配置机制迁移

本节从"**自动配置视角**"讲为什么要迁移、自动配置清单去了哪里。完整的 SPI 迁移矩阵、Boot 2.7 过渡期、升级踩坑列表，见 [Spring容器启动流程深度解析 · SPI 与 .imports 机制](@spring-核心基础-Spring容器启动流程深度解析)。

### 8.1 为什么要迁移

Boot 2.x 把"自动配置类清单"和"其他扩展点（`ApplicationContextInitializer`、`EnvironmentPostProcessor`、`SpringApplicationRunListener`…）"**全塞在同一个 `spring.factories` 文件里**，按键区分：

```properties
# META-INF/spring.factories（Boot 2.x 典型内容）
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
  com.example.MyAutoConfiguration,\
  com.example.OtherAutoConfiguration

org.springframework.context.ApplicationContextInitializer=\
  com.example.MyInitializer
```

这样设计有三个问题：

1. **解析歧义**：键名字符串匹配，写错一个字母就静默失败，排查极费劲；
2. **启动慢**：`SpringFactoriesLoader` 每次读全文件、用反射实例化；而自动配置场景下只需要"拿到类名清单"这一个动作；
3. **AOT 编译不友好**：Spring 6 / Boot 3 全面支持 GraalVM Native Image，反射密集的 `SpringFactoriesLoader` 路径需要生成大量反射提示配置。

### 8.2 Boot 3 的新方案：.imports 纯文本清单

Boot 3 给自动配置**单独拎一个文件**，纯文本一行一个类名：

```text
# META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
com.example.MyAutoConfiguration
com.example.OtherAutoConfiguration
```

同时推出 `@AutoConfiguration` 元注解取代"自动配置类上的 `@Configuration` + `@AutoConfigureBefore/After/Order`"：

```java
// Boot 2.x 旧写法
@Configuration(proxyBeanMethods = false)
@AutoConfigureBefore(DataSourceAutoConfiguration.class)
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
public class MyAutoConfiguration { ... }

// Boot 3.x 推荐写法：一个元注解搞定
@AutoConfiguration(before = DataSourceAutoConfiguration.class)
public class MyAutoConfiguration { ... }
```

### 8.3 迁移对照速查

| 变化点 | Boot 2.x | Boot 3.x |
| :-- | :-- | :-- |
| 自动配置清单文件 | `META-INF/spring.factories`（键 `EnableAutoConfiguration`） | `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` |
| 清单格式 | Properties（键值对，逗号/反斜杠续行） | 纯文本（一行一个类名，`#` 开头为注释） |
| 自动配置类注解 | `@Configuration` + `@AutoConfigureBefore/After/Order` 分散写 | `@AutoConfiguration(before=..., after=..., order=...)` 一站式 |
| 其他扩展点（非自动配置） | 继续用 `spring.factories` | 继续用 `spring.factories`，**不受影响** |
| Boot 2.7 过渡期 | 两种格式都被读取 | 仅支持新格式 |
| Java 最低版本 | Java 8 | Java 17 |
| Jakarta EE | `javax.*` | `jakarta.*` |

!!! tip "调试自动配置的 3 种方法"
    1. **`--debug` 启动参数**：最常用。控制台打印 `Conditions Evaluation Report`，分 `Positive matches`（生效）/ `Negative matches`（未生效）/ `Exclusions`（被 exclude）/ `Unconditional classes`（无条件类）四段。
    2. **Actuator `/actuator/conditions` 端点**：生产环境首选。需要依赖 `spring-boot-starter-actuator` 并在 `management.endpoints.web.exposure.include` 暴露 `conditions`，返回 JSON 格式，可被监控系统抓取。
    3. **`ConditionEvaluationReport` API**：编程式访问。在测试中 `ConditionEvaluationReport.get(beanFactory)` 可直接拿到条件评估结果，用于断言"某个自动配置类确实被某个条件挡住了"。

---

## 9. 不理解底层会踩的 4 个坑

### 9.1 坑 ①：@SpringBootApplication(exclude=) vs @EnableAutoConfiguration(exclude=) 作用域差异

两者**都**能排除自动配置类，但在**多模块 + 继承结构**下有微妙差异：

```java
// 场景 A：在启动类上直接 exclude，作用于本启动应用
@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)
public class Application { ... }

// 场景 B：通过自定义元注解传递 exclude
@EnableAutoConfiguration(exclude = DataSourceAutoConfiguration.class)
@ComponentScan
@SpringBootConfiguration
public @interface MyBootApp { ... }

@MyBootApp   // ⚠️ 这里的 exclude 不会继承生效！
public class Application { ... }
```

**根因**：`@SpringBootApplication` 的 `exclude` 是通过 `@AliasFor` 直通到 `@EnableAutoConfiguration.exclude` 的显式别名，而自定义元注解的 `@EnableAutoConfiguration` 属性不会被再次提取。**结论**：exclude 只在**标注的那个注解**上声明，不要期望被元注解传递。

### 9.2 坑 ②：@AutoConfigureBefore/After/Order 在类未被 .imports 收录时失效

很多人以为"在自动配置类上加 `@AutoConfigureBefore` 就能保证它先于某个类加载"——这是**只对了一半**：

- 前提：**本类必须在 `.imports` 文件里登记**，才会进入 `AutoConfigurationSorter` 的排序范围；
- 如果本类只是一个普通 `@Configuration` 被 `@ComponentScan` 扫到，`@AutoConfigureBefore/After/Order` 会被**完全忽略**（它们是 `AutoConfigurationSorter` 私有识别的元注解，不走 `@Order` 那条路径）。

排查办法：在启动参数加 `--debug`，看 `Positive matches` 里能不能找到本类。找不到就说明根本没被当作"自动配置"处理。

### 9.3 坑 ③：自定义 @Configuration 放在 @SpringBootApplication 所在包之外时不被扫描

`@SpringBootApplication` 隐含了 `@ComponentScan`，而 `@ComponentScan` **默认只扫描启动类所在包及其子包**：

```text
com.example.app                          ← 启动类包
├── Application.java                     @SpringBootApplication
├── service/UserService.java             ✅ 被扫描
└── ...

com.other                                ← 不在启动类包下
└── config/ExtConfig.java                ❌ 不被扫描！即使加了 @Configuration
```

**解决方案三选一**：
1. 把类移到启动类包或子包下（推荐）；
2. 在启动类上加 `@ComponentScan(basePackages = {"com.example.app", "com.other"})`；
3. 把 `ExtConfig` 做成**自动配置类**：在自己的 jar 里加 `META-INF/spring/....imports` 并把它登记进去——这样就绕开了 `@ComponentScan` 的包限制，走 §5 的链路加载。

### 9.4 坑 ④：@ConditionalOnMissingBean 在 @Bean 方法 vs 类级别的求值时机差异

```java
@AutoConfiguration
@ConditionalOnMissingBean(DataSource.class)   // ⚠️ 类级别
public class MyDataSourceAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(DataSource.class)   // ✅ 方法级别
    public DataSource dataSource() { ... }
}
```

两者**时机完全不同**：

| 位置 | 触发时机 | 风险 |
| :-- | :-- | :-- |
| 类级别 | §5 第 ④ 步批量过滤（`OnBeanCondition` 批量检查），此时**其他自动配置类的 `@Bean` 可能还没登记** | 如果另一个自动配置类也会创建 `DataSource` 且按 `@AutoConfigureBefore` 顺序在前，你这边类级别的检查拿不到它，会"双注册竞争"——通常让 Spring 直接抛错或让 `@Primary` 生效 |
| 方法级别 | 本类被当作 `@Configuration` 解析时**逐个 `@Bean` 求值**，此时**所有自动配置类的 Bean 定义已登记** | 准确、推荐 |

**结论**：**优先用方法级别的 `@ConditionalOnMissingBean`**；类级别只用于"整个配置类都依赖某个类存在"的粗粒度场景。

---

## 10. 常见问题 Q&A

> 📖 **实战问题**："如何自定义 Starter"、"自动配置不生效怎么排查"等工程实现题，请见 [Spring实战应用题](@spring-测试与实战-Spring实战应用题)。本文专注"原理机制"题。

**Q1：自动配置是怎么知道我需要哪些组件的？**
> **答**：通过**条件注解**智能判断。比如：
> 
> - `@ConditionalOnClass`：检测类路径有没有某个类（如检测到 `DataSource.class` 存在，就自动配置数据源）
> - `@ConditionalOnMissingBean`：检测容器里是否已有用户自定义的 Bean（如没有 `DataSource` Bean，才自动配置默认数据源）
> - `@ConditionalOnProperty`：检测配置文件中的属性值
> 
> **生活比喻**：管家通过扫描你的行李（依赖包）和听你的要求（配置文件），决定要启动哪些设备。

**Q2：为什么我自定义的配置会覆盖自动配置？**
> **答**：因为自动配置使用了**延迟决策**机制。`DeferredImportSelector` 会等所有用户 `@Configuration` 类解析完，再决定是否激活自动配置。
> 
> **工作流程**：
> 
> 1. 先解析你的自定义配置类 → 注册你的 Bean
> 2. 再检查自动配置条件 → 发现容器已有 Bean（`@ConditionalOnMissingBean` 返回 false）
> 3. 跳过自动配置 → 避免冲突
> 
> **生活比喻**：管家等你把所有家具摆好，再决定要不要启动智能设备。

**Q3：自动配置会影响启动性能吗？**
> **答**：Spring Boot 做了大量优化：
> 
> - **批量过滤**：先快速筛选 130+ 个候选类，避免全部加载
> - **延迟求值**：只在需要时才执行条件判断
> - **并行处理**：大项目中条件检查会并行化
> 
> **实际效果**：对启动时间影响很小，但大大减少了配置工作量。

**Q4：如何查看哪些自动配置生效了？**
> **答**：两种方法：
> 
> 1. **启动参数**：`java -jar app.jar --debug`，控制台会打印条件评估报告
> 2. **Actuator 端点**：访问 `/actuator/conditions` 查看 JSON 格式的详细报告
> 
> **生活比喻**：管家给你一份设备启动报告，告诉你哪些设备已激活、哪些被跳过。

---

## 11. 核心原理总结

**自动配置的核心思想：智能管家模式**

1. **智能感知**：通过条件注解（`@ConditionalOnXxx`）检测你的项目需要什么
2. **用户优先**：延迟决策（`DeferredImportSelector`）保证你的自定义配置永远优先
3. **按需激活**：只有在你确实需要时才自动配置，避免资源浪费
4. **开箱即用**：引入 starter 依赖就能获得最佳实践配置

**一句话记忆**：Spring Boot 自动配置 = 预制好的最佳实践 + 智能判断机制 + 用户优先原则。它不是魔法，而是把"专家经验"自动化了。

**实际开发中记住**：

- 引入 starter 依赖就能获得自动配置
- 自定义配置会自然覆盖自动配置
- 用 `--debug` 参数查看哪些配置生效了
- 理解原理能帮你排查配置问题，但日常开发几乎不需要手动干预