# 第1章 企业开发演进与 Spring 核心思想

> **核心问题：** 为什么 Java 企业开发从单体走向微服务？Spring 为何能取代 Java EE 成为事实标准？IoC 容器究竟解决了什么问题？

---

## 1.1 从单体到企业系统

### 1.1.1 单体应用的黄金时代

早期的 Java Web 应用结构简单，一个 WAR 包部署到 Tomcat 就能跑起来：

```text
┌─────────────────────────────────┐
│           单体应用 (WAR)          │
│  ┌───────┐ ┌──────┐ ┌────────┐  │
│  │ 表示层 │ │业务层│ │数据访问层│  │
│  └───┬───┘ └──┬───┘ └───┬────┘  │
│      └────────┴─────────┘       │
│            共享数据库             │
└─────────────────────────────────┘
```

这种架构在用户量小、功能少的场景下非常高效：

| 维度 | 单体适用范围 | 瓶颈表现 |
|------|------------|---------|
| 用户量 | < 1000 并发 | 响应时间急剧上升 |
| 数据量 | < 100 万行 | 单库查询变慢 |
| 团队规模 | < 10 人 | 代码冲突频繁 |
| 部署频率 | 每周一次 | 一个小改动需要全量发布 |

### 1.1.2 复杂度增长驱动架构拆分

当系统规模增长，单体架构暴露出三大问题：

**第一，可用性耦合。** 订单模块的慢查询会拖垮整个系统，支付模块不能独立扩容。

**第二，交付效率下降。** 50 人团队修改同一个代码仓库，合并冲突、联调测试成为瓶颈。

**第三，技术栈固化。** 单体系统很难在部分模块中引入新的数据库或中间件。

拆分的演进路径：

```text
单体 → 垂直拆分 → SOA → 微服务
 │         │        │       │
 │         │        │       └─ 独立部署、独立数据库
 │         │        └─ ESB 总线、服务注册
 │         └─ 按业务域拆成多个独立应用
 └─ 所有代码打包在一起
```

### 1.1.3 拆分带来的新挑战

拆分不是免费的午餐。网络调用引入延迟和故障，分布式事务变得复杂，服务间通信需要治理。这些正是后续 Spring Cloud 要解决的问题。

---

## 1.2 从 Java EE 到 Spring

### 1.2.1 EJB 的重量级时代

Java EE（早期称 J2EE）定义了企业开发的标准，其核心组件 EJB（Enterprise JavaBean）提供事务、安全、远程调用等企业特性。但 EJB 的代价高昂：

```java
// EJB 时代：一个简单的业务组件
public interface UserService extends EJBObject {
    UserDTO findUser(Long id) throws RemoteException;
}

@Stateless
public class UserServiceBean implements SessionBean {
    private SessionContext ctx;

    public void setSessionContext(SessionContext ctx) {
        this.ctx = ctx;
    }

    public UserDTO findUser(Long id) {
        // 业务逻辑只占 10% 的代码
        // 其余是样板代码
    }

    public void ejbCreate() {}
    public void ejbRemove() {}
    public void ejbActivate() {}
    public void ejbPassivate() {}
}
```

EJB 的核心痛点：

| 痛点 | 表现 |
|------|------|
| 侵入性强 | 必须实现特定接口、继承特定类 |
| 部署复杂 | 需要完整的应用服务器（WebLogic、WebSphere） |
| 测试困难 | 无法脱离容器运行单元测试 |
| 学习曲线陡 | XML 配置量巨大 |

### 1.2.2 Spring 的 POJO 革命

Rod Johnson 在 2002 年出版的《Expert One-on-One J2EE Design and Development》奠定了 Spring 的思想基础：**用 POJO（Plain Old Java Object）就能完成企业开发。**

```java
// Spring 时代：同一个业务组件
@Service
public class UserService {

    private final UserRepository userRepository;

    // 构造器注入，无需实现任何框架接口
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User findUser(Long id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
    }
}
```

对比之下，代码量减少了 70% 以上，且完全不依赖 Spring API。

### 1.2.3 Spring Boot：约定优于配置

Spring 虽然比 EJB 轻量，但 XML 配置依然繁琐。Spring Boot 在 2014 年带来三大改变：

```java
@SpringBootApplication  // 一个注解替代上百行 XML
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}
```

**Spring Boot 的核心理念：**

1. **自动配置（Auto-Configuration）：** 引入 `spring-boot-starter-web` 自动配置内嵌 Tomcat、Spring MVC、Jackson
2. **起步依赖（Starter）：** 一个 `spring-boot-starter-data-jpa` 引入 JPA + Hibernate + HikariCP 的最佳组合
3. **Actuator：** 开箱即用的健康检查、指标监控端点

```text
Spring Boot 的依赖引入链：
spring-boot-starter-data-jpa
  → spring-boot-starter-jdbc
    → HikariCP (连接池)
    → spring-jdbc
  → hibernate-core
  → spring-data-jpa
  → spring-aspects
```

### 1.2.4 Spring Cloud：微服务治理

Spring Cloud 在 Spring Boot 基础上，提供微服务架构的一站式解决方案：

```text
┌────────────────────────────────────────────────┐
│                 Spring Cloud 全景               │
│                                                │
│  服务注册发现    配置中心      网关              │
│  (Eureka/Nacos) (Config/Nacos) (Gateway/Zuul)  │
│                                                │
│  负载均衡       熔断降级      链路追踪           │
│  (LoadBalancer) (Resilience4j) (Sleuth/Zipkin) │
│                                                │
│  消息总线       分布式事务     安全              │
│  (Bus/Stream)   (Seata)       (Security/OAuth2) │
└────────────────────────────────────────────────┘
```

---

## 1.3 为什么需要 IoC

### 1.3.1 传统开发中的对象管理

在没有 IoC 容器的情况下，对象的创建和依赖关系由开发者手动管理：

```java
// 传统方式：对象自己负责创建依赖
public class OrderService {

    private OrderRepository orderRepository;
    private UserService userService;
    private PaymentService paymentService;

    public OrderService() {
        // 紧耦合：直接 new 具体实现
        DataSource ds = new HikariDataSource(config);
        this.orderRepository = new JdbcOrderRepository(ds);
        this.userService = new RemoteUserService(httpClient);
        this.paymentService = new AlipayService(alipayConfig);
    }
}
```

这种写法有三个致命问题：

1. **无法替换实现。** 想把 `AlipayService` 换成 `WechatPayService`，必须修改 `OrderService` 的源码。
2. **无法独立测试。** 单元测试 `OrderService` 时，必须连接真实的数据库和支付网关。
3. **对象生命周期不可控。** 每次 `new` 都创建新实例，无法实现单例、池化等管理策略。

### 1.3.2 IoC 的思想本质

**IoC（Inversion of Control，控制反转）** 的核心是：对象不再自己创建依赖，而是由外部容器负责注入。

```java
// IoC 方式：依赖由外部注入
public class OrderService {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;

    // 构造器注入：谁来调用这个构造器，由容器决定
    public OrderService(OrderRepository orderRepository,
                        PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
    }
}
```

控制反转的对比：

| 维度 | 传统方式 | IoC 方式 |
|------|---------|---------|
| 对象创建 | 使用者主动 `new` | 容器负责创建 |
| 依赖关系 | 硬编码在代码中 | 声明式配置（注解/XML） |
| 可替换性 | 修改源码 | 修改配置或注解 |
| 可测试性 | 需要真实环境 | 注入 Mock 对象 |

### 1.3.3 容器的工作流程

```text
开发者定义组件         容器管理生命周期         使用者获取实例
   (POJO)               (BeanFactory)            (getBean)
     │                      │                       │
     │  @Component          │  扫描注解/XML          │
     ├─────────────────────→│                       │
     │                      │  创建实例              │
     │                      │  注入依赖              │
     │                      │  调用初始化回调         │
     │                      │  缓存管理              │
     │                      ├──────────────────────→ │
     │                      │                       │
     │                      │  销毁回调              │
     │                      │←───────────────────────│
```

---

## 1.4 Bean 的本质与生命周期

### 1.4.1 什么是 Bean

在 Spring 中，**Bean 是由 IoC 容器管理的对象**。它不是某种特殊类，任何 POJO 都可以成为 Bean。容器通过 `BeanDefinition` 这个元数据来描述一个 Bean 的全部信息。

```java
// 这就是一个 Bean 的定义
@Component
@Scope("singleton")
@Lazy
public class UserService {
    // ...
}

// 等价的 BeanDefinition 内容：
// beanClassName = "com.example.UserService"
// scope = "singleton"
// lazyInit = true
// autowireMode = "constructor"
```

### 1.4.2 Bean 的完整生命周期

Bean 从定义到销毁，经历以下阶段：

<SvgDiagram src="/diagrams/spring-bean-lifecycle.svg" />

### 1.4.3 各阶段代码示例

```java
@Component
public class LifecycleDemoBean implements BeanNameAware,
        BeanFactoryAware, InitializingBean, DisposableBean {

    private String beanName;
    private BeanFactory beanFactory;

    // 1. 构造器 → 实例化
    public LifecycleDemoBean() {
        System.out.println("1. 构造器调用");
    }

    // 2. 属性注入完成后
    @Autowired
    public void setDataSource(DataSource ds) {
        System.out.println("2. 属性赋值");
    }

    // 3. Aware 回调
    @Override
    public void setBeanName(String name) {
        this.beanName = name;
        System.out.println("3. BeanNameAware: " + name);
    }

    @Override
    public void setBeanFactory(BeanFactory factory) {
        this.beanFactory = factory;
        System.out.println("4. BeanFactoryAware");
    }

    // 5. @PostConstruct
    @PostConstruct
    public void postConstruct() {
        System.out.println("5. @PostConstruct");
    }

    // 6. InitializingBean
    @Override
    public void afterPropertiesSet() {
        System.out.println("6. InitializingBean#afterPropertiesSet");
    }

    // 7. 自定义 init-method（XML 中配置）
    // public void customInit() { ... }

    // 8. 销毁阶段
    @PreDestroy
    public void preDestroy() {
        System.out.println("7. @PreDestroy");
    }

    @Override
    public void destroy() {
        System.out.println("8. DisposableBean#destroy");
    }
}
```

### 1.4.4 BeanPostProcessor 的特殊角色

`BeanPostProcessor` 是 Spring 最强大的扩展点之一。AOP、`@Autowired`、`@Transactional` 等特性都依赖它实现：

```java
@Component
public class CustomBeanPostProcessor implements BeanPostProcessor {

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) {
        // 可以在此修改 Bean 的属性或返回代理
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        // AOP 代理就在此处创建
        if (bean.getClass().isAnnotationPresent(Monitorable.class)) {
            return createProxy(bean);  // 返回代理对象替代原对象
        }
        return bean;
    }
}
```

---

## 1.5 ApplicationContext vs BeanFactory

### 1.5.1 两者的关系

`BeanFactory` 是 Spring 容器的最顶层接口，`ApplicationContext` 是它的子接口，提供了更多企业级功能。

```java
// BeanFactory：最基础的容器
BeanFactory factory = new DefaultListableBeanFactory();
// 手动加载 BeanDefinition...

// ApplicationContext：功能更丰富
ApplicationContext ctx = new ClassPathXmlApplicationContext("beans.xml");
UserService userService = ctx.getBean(UserService.class);
```

### 1.5.2 核心差异对比

| 特性 | BeanFactory | ApplicationContext |
|------|------------|-------------------|
| Bean 实例化策略 | 延迟加载（getBean 时才创建） | 启动时预加载所有单例 Bean |
| 国际化（i18n） | 不支持 | 内置 MessageSource |
| 事件发布 | 不支持 | 内置 ApplicationEventPublisher |
| 资源访问 | 不支持 | 统一的 Resource 接口（classpath/file/URL） |
| Environment 抽象 | 不支持 | 内置 Environment，支持 Profile |
| AOP 集成 | 需手动配置 | 自动检测并集成 |
| 常用实现类 | DefaultListableBeanFactory | ClassPathXmlApplicationContext / AnnotationConfigApplicationContext |

### 1.5.3 实际选择

**99% 的场景使用 `ApplicationContext`。** `BeanFactory` 主要在以下场景使用：

- 内存极度受限的嵌入式设备
- 需要完全控制 Bean 加载顺序的底层框架开发

Spring Boot 中自动创建的就是 `AnnotationConfigServletWebServerApplicationContext`，它是 `ApplicationContext` 的具体实现。

---

## 1.6 依赖注入方式

### 1.6.1 三种注入方式

```java
// 方式一：构造器注入（推荐）
@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;

    // Spring 4.3+ 单构造器时 @Autowired 可省略
    public OrderService(OrderRepository orderRepository,
                        PaymentService paymentService) {
        this.orderRepository = orderRepository;
        this.paymentService = paymentService;
    }
}

// 方式二：Setter 注入（可选依赖时使用）
@Service
public class NotificationService {
    private EmailSender emailSender;

    @Autowired  // 可选依赖
    public void setEmailSender(EmailSender emailSender) {
        this.emailSender = emailSender;
    }
}

// 方式三：字段注入（不推荐）
@Service
public class ReportService {
    @Autowired  // 不推荐
    private DataSource dataSource;
}
```

### 1.6.2 为什么构造器注入是首选

| 对比维度 | 构造器注入 | Setter 注入 | 字段注入 |
|---------|-----------|------------|---------|
| 不可变性 | ✅ 字段可声明 `final` | ❌ 字段可变 | ❌ 字段可变 |
| 必需依赖保证 | ✅ 对象创建时就绑定 | ❌ 可能忘记调用 | ❌ 运行时才暴露 |
| 单元测试 | ✅ 直接 `new` 传参 | ✅ 调用 setter | ❌ 需反射或 Spring 容器 |
| NPE 防范 | ✅ 编译期保证 | ❌ 运行时可能 NPE | ❌ 运行时可能 NPE |
| 循环依赖检测 | ✅ 启动时即报错 | ⚠️ 可能延迟发现 | ⚠️ 可能延迟发现 |
| 代码简洁度 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

Spring 官方和 IntelliJ IDEA 均推荐构造器注入。`final` 字段的不可变性是最重要的理由——一旦对象创建完成，依赖就不会被意外修改。

### 1.6.3 @Autowired 与 @Resource 的区别

```java
// @Autowired：按类型匹配（Spring 注解）
@Autowired
private UserService userService;

// @Resource：按名称匹配（JSR-250 标准注解）
@Resource(name = "userService")
private UserService userService;
```

| 特性 | @Autowired | @Resource |
|------|-----------|-----------|
| 来源 | Spring 框架 | JSR-250 / javax.annotation |
| 匹配策略 | 先按类型，再按名称 | 先按名称，再按类型 |
| 必需性 | 默认 required=true | 默认 required=true |
| 指定名称 | 配合 @Qualifier | 通过 name 属性 |

---

> IoC 的思想知道了，但 Bean 是怎么被创建出来的？从扫描到就绪，中间有 12 个步骤。循环依赖为什么靠三级缓存能解？AOP 代理在哪个环节织入？下一章深入容器内部，拆解这些机制。
