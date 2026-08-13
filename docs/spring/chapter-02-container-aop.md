# 第2章 Spring 容器机制与 AOP

> 你以为 Spring 只是帮你 `new` 对象？从 `new AnnotationConfigApplicationContext()` 到容器就绪，背后有 12 个步骤：扫描、解析、实例化、注入、初始化、后处理……BeanDefinition 是什么？循环依赖为什么靠三级缓存能解？AOP 代理在哪个环节织入？本章逐层拆解 Spring 容器的内部运作。

---

## 2.1 Spring 启动流程

### 2.1.1 容器启动的完整链路

以 `AnnotationConfigApplicationContext` 为例，Spring 容器的启动过程：

```java
ApplicationContext ctx = new AnnotationConfigApplicationContext(AppConfig.class);
```

这行代码背后发生了什么：

```text
new AnnotationConfigApplicationContext(AppConfig.class)
        │
        ▼
  this()  → 创建 DefaultListableBeanFactory + AnnotatedBeanDefinitionReader + ClassPathBeanDefinitionScanner
        │
        ▼
  register(AppConfig.class)  → 将 AppConfig 解析为 BeanDefinition 注册到 BeanFactory
        │
        ▼
  refresh()  ← 核心方法，12 个步骤
        │
        ├── 1. prepareRefresh()           → 环境准备、属性源初始化
        ├── 2. obtainFreshBeanFactory()   → 获取 BeanFactory
        ├── 3. prepareBeanFactory()       → 设置类加载器、SpEL 解析器等
        ├── 4. postProcessBeanFactory()   → 子类扩展点（Web 环境注册 Scope）
        ├── 5. invokeBeanFactoryPostProcessors()  → ★ 执行 BeanFactoryPostProcessor
        ├── 6. registerBeanPostProcessors()       → ★ 注册 BeanPostProcessor
        ├── 7. initMessageSource()        → 国际化支持
        ├── 8. initApplicationEventMulticaster()  → 事件广播器
        ├── 9. onRefresh()                → 子类扩展（创建 Web 服务器）
        ├── 10. registerListeners()       → 注册事件监听器
        ├── 11. finishBeanFactoryInitialization() → ★ 实例化所有非延迟单例 Bean
        └── 12. finishRefresh()           → 发布 ContextRefreshedEvent
```

### 2.1.2 BeanFactoryPostProcessor 的作用

`BeanFactoryPostProcessor` 在 Bean 实例化**之前**执行，可以修改 BeanDefinition 的元数据：

```java
@Component
public class CustomPropertySource implements BeanFactoryPostProcessor {

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory factory) {
        // 获取某个 BeanDefinition 并修改其属性
        BeanDefinition bd = factory.getBeanDefinition("dataSource");
        MutablePropertyValues pvs = bd.getPropertyValues();
        pvs.addPropertyValue("maxPoolSize", 20);  // 修改连接池大小
    }
}
```

Spring 内置的重要 BeanFactoryPostProcessor：

| 处理器 | 作用 |
|--------|------|
| `ConfigurationClassPostProcessor` | 解析 @Configuration、@ComponentScan、@Import |
| `PropertySourcesPlaceholderConfigurer` | 解析 ${...} 占位符 |
| `MapperScannerConfigurer` (MyBatis) | 扫描 Mapper 接口注册为 Bean |

### 2.1.3 Bean 的实例化顺序

```text
1. BeanFactoryPostProcessor 修改 BeanDefinition
        │
        ▼
2. 实例化（通过构造器或工厂方法）
        │
        ▼
3. 属性填充（populateBean）← @Autowired 在此解析
        │
        ▼
4. 初始化（initializeBean）← @PostConstruct、BeanPostProcessor
        │
        ▼
5. 注册到单例缓存池
```

---

## 2.2 BeanDefinition

### 2.2.1 BeanDefinition 的核心属性

`BeanDefinition` 是 Spring 容器中 Bean 的元数据描述，类似于 Java 类的 `Class` 对象：

```java
public interface BeanDefinition extends AttributeAccessor, BeanMetadataElement {

    // Bean 的类名
    void setBeanClassName(String beanClassName);
    String getBeanClassName();

    // 作用域：singleton / prototype / request / session
    void setScope(String scope);
    String getScope();

    // 是否延迟初始化
    void setLazyInit(boolean lazyInit);
    boolean isLazyInit();

    // 依赖关系
    void setDependsOn(String... dependsOn);
    String[] getDependsOn();

    // 是否为自动装配候选者
    void setAutowireCandidate(boolean autowireCandidate);

    // 构造器参数和属性值
    ConstructorArgumentValues getConstructorArgumentValues();
    MutablePropertyValues getPropertyValues();

    // 初始化和销毁方法
    void setInitMethodName(String initMethodName);
    void setDestroyMethodName(String destroyMethodName);
}
```

### 2.2.2 BeanDefinition 的来源

BeanDefinition 不仅来自注解扫描，还有多种来源：

| 来源 | 示例 |
|------|------|
| @Component 扫描 | `@Service`, `@Repository`, `@Controller` |
| @Configuration + @Bean | `@Bean public DataSource dataSource()` |
| @Import | `@Import({DataSourceConfig.class, RedisConfig.class})` |
| XML 配置 | `<bean id="userService" class="..."/>` |
| 编程式注册 | `registry.registerBeanDefinition(...)` |
| 条件注册 | `@Conditional`, `@ConditionalOnClass` |

### 2.2.3 从注解到 BeanDefinition 的转换

```java
// 源代码
@Service
@Scope("prototype")
@Lazy
public class ReportGenerator {
    @Value("${report.template.dir}")
    private String templateDir;
}

// 转换后的 BeanDefinition（简化表示）
GenericBeanDefinition {
    beanClassName = "com.example.ReportGenerator",
    scope = "prototype",
    lazyInit = true,
    autowireMode = AUTOWIRE_NO,
    role = ROLE_APPLICATION,
    propertyValues = [
        "templateDir" → "${report.template.dir}"  // 占位符，后续由 PropertySourcesPlaceholderConfigurer 解析
    ]
}
```

---

## 2.3 循环依赖与三级缓存

### 2.3.1 什么是循环依赖

当 A 依赖 B，B 又依赖 A 时，就形成了循环依赖：

```java
@Service
public class ServiceA {
    @Autowired
    private ServiceB serviceB;
}

@Service
public class ServiceB {
    @Autowired
    private ServiceA serviceA;
}
```

如果没有任何处理机制，实例化 ServiceA 需要 ServiceB，实例化 ServiceB 又需要 ServiceA，形成死锁。

### 2.3.2 三级缓存的结构

Spring 通过三级缓存解决**单例 + Setter/字段注入**场景下的循环依赖：

```java
// DefaultSingletonBeanRegistry 中的三个 Map

/** 一级缓存：完全初始化好的单例 Bean */
Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

/** 二级缓存：提前暴露的半成品 Bean（已实例化，未完成属性填充） */
Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);

/** 三级缓存：Bean 的 ObjectFactory（用于创建早期引用，可能是代理对象） */
Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
```

### 2.3.3 三级缓存的工作流程

以 ServiceA 和 ServiceB 的循环依赖为例：

<SvgDiagram src="/diagrams/spring-aop-proxy.svg" />

### 2.3.4 为什么需要三级缓存而不是两级

两级缓存足以解决简单的循环依赖，但无法处理 AOP 代理场景。三级缓存中的 `ObjectFactory` 可以在需要时决定返回原始对象还是代理对象：

```java
// AbstractAutowireCapableBeanFactory
protected Object getEarlyBeanReference(String beanName, BeanDefinition mbd, Object bean) {
    Object exposedObject = bean;
    // 遍历所有 SmartInstantiationAwareBeanPostProcessor
    for (SmartInstantiationAwareBeanPostProcessor bp : getBeanPostProcessors(...)) {
        // 如果有 AOP 代理需求，这里会返回代理对象
        exposedObject = bp.getEarlyBeanReference(exposedObject, beanName);
    }
    return exposedObject;
}
```

### 2.3.5 三级缓存的局限性

| 场景 | 是否能解决 |
|------|-----------|
| Setter 注入循环依赖 | ✅ 可以解决 |
| 字段注入循环依赖 | ✅ 可以解决 |
| 构造器注入循环依赖 | ❌ 无法解决（实例化阶段就需要依赖，无法提前暴露） |
| Prototype 作用域循环依赖 | ❌ 无法解决（不缓存 Prototype Bean） |

**构造器注入的循环依赖会在启动时直接报错，这恰恰是推荐构造器注入的理由之一——尽早暴露设计问题。**

```java
// 构造器循环依赖：启动直接报错
// BeanCurrentlyInCreationException: Requested bean is currently in creation
@Service
public class ServiceA {
    public ServiceA(ServiceB b) { }
}

@Service
public class ServiceB {
    public ServiceB(ServiceA a) { }
}
```

解决方案：打破循环，引入第三个服务或使用 `@Lazy`：

```java
@Service
public class ServiceA {
    private final ServiceB serviceB;

    public ServiceA(@Lazy ServiceB serviceB) {
        this.serviceB = serviceB;  // 注入的是代理，首次调用时才真正初始化
    }
}
```

---

## 2.4 AOP 核心概念

### 2.4.1 什么是 AOP

AOP（Aspect-Oriented Programming，面向切面编程）是一种将横切关注点（cross-cutting concerns）从业务逻辑中分离出来的编程范式。

**横切关注点** 是指散布在多个模块中的通用功能，如日志记录、事务管理、权限校验：

```java
// 没有 AOP 时：业务代码与横切逻辑耦合
public class OrderService {

    public Order createOrder(OrderRequest request) {
        log.info("创建订单开始: {}", request);      // 日志
        TransactionStatus tx = txManager.getTransaction(new DefaultTransactionDefinition());
        try {
            checkPermission("order:create");          // 权限
            Order order = doCreateOrder(request);
            txManager.commit(tx);
            log.info("创建订单成功: {}", order.getId()); // 日志
            return order;
        } catch (Exception e) {
            txManager.rollback(tx);
            log.error("创建订单失败", e);              // 日志
            throw e;
        }
    }
}
```

使用 AOP 后，业务逻辑回归纯粹：

```java
@Service
public class OrderService {

    @Transactional
    @PreAuthorize("hasAuthority('order:create')")
    public Order createOrder(OrderRequest request) {
        return doCreateOrder(request);  // 只关注业务
    }
}
```

### 2.4.2 AOP 核心术语

| 术语 | 含义 | Spring 中的对应 |
|------|------|----------------|
| **Aspect**（切面） | 横切关注点的模块化 | `@Aspect` 注解的类 |
| **JoinPoint**（连接点） | 程序执行的某个点（方法调用、异常抛出等） | Spring AOP 仅支持方法执行 |
| **Pointcut**（切入点） | 匹配连接点的表达式 | `@Pointcut("execution(* com.example..*.*(..))")` |
| **Advice**（通知） | 在切入点执行的动作 | `@Before`, `@After`, `@Around` 等 |
| **Weaving**（织入） | 将切面应用到目标对象的过程 | 运行时通过代理实现 |
| **Target**（目标对象） | 被代理的原始对象 | 业务 Bean |
| **AOP Proxy**（代理对象） | 容器创建的代理实例 | JDK 动态代理或 CGLIB 代理 |

### 2.4.3 五种通知类型

```java
@Aspect
@Component
public class LoggingAspect {

    // 前置通知：方法执行前
    @Before("execution(* com.example.service.*.*(..))")
    public void beforeMethod(JoinPoint jp) {
        log.info("调用 {} - 参数: {}", jp.getSignature(), jp.getArgs());
    }

    // 后置通知：方法执行后（无论是否异常）
    @After("execution(* com.example.service.*.*(..))")
    public void afterMethod(JoinPoint jp) {
        log.info("完成 {}", jp.getSignature());
    }

    // 返回通知：方法正常返回后
    @AfterReturning(pointcut = "execution(* com.example.service.*.*(..))", returning = "result")
    public void afterReturning(JoinPoint jp, Object result) {
        log.info("返回值: {}", result);
    }

    // 异常通知：方法抛出异常后
    @AfterThrowing(pointcut = "execution(* com.example.service.*.*(..))", throwing = "ex")
    public void afterThrowing(JoinPoint jp, Exception ex) {
        log.error("异常: {}", ex.getMessage());
    }

    // 环绕通知：最强大，可控制是否执行目标方法
    @Around("execution(* com.example.service.*.*(..))")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return pjp.proceed();  // 执行目标方法
        } finally {
            log.info("耗时: {}ms", System.currentTimeMillis() - start);
        }
    }
}
```

---

## 2.5 动态代理

### 2.5.1 JDK 动态代理

JDK 动态代理基于接口，通过 `java.lang.reflect.Proxy` 创建代理对象：

```java
// 目标接口
public interface UserService {
    User findById(Long id);
}

// 目标实现
public class UserServiceImpl implements UserService {
    public User findById(Long id) { return userDao.findById(id); }
}

// JDK 动态代理
UserService proxy = (UserService) Proxy.newProxyInstance(
    UserService.class.getClassLoader(),
    new Class[]{UserService.class},
    (Object proxyObj, Method method, Object[] args) -> {
        System.out.println("Before: " + method.getName());
        Object result = method.invoke(target, args);  // 调用真实对象
        System.out.println("After: " + method.getName());
        return result;
    }
);
```

**关键限制：目标类必须实现至少一个接口。**

### 2.5.2 CGLIB 代理

CGLIB 通过生成目标类的子类来实现代理：

```java
// CGLIB 代理（简化示意）
Enhancer enhancer = new Enhancer();
enhancer.setSuperclass(UserServiceImpl.class);
enhancer.setCallback((MethodInterceptor) (obj, method, args, proxy) -> {
    System.out.println("Before: " + method.getName());
    Object result = proxy.invoke(obj, args);  // 调用父类方法
    System.out.println("After: " + method.getName());
    return result;
});
UserServiceImpl proxy = (UserServiceImpl) enhancer.create();
```

**关键限制：目标类和方法不能是 `final` 的。**

### 2.5.3 两种代理方式对比

| 维度 | JDK 动态代理 | CGLIB |
|------|-------------|-------|
| 实现原理 | 基于接口，生成接口的实现类 | 基于继承，生成目标类的子类 |
| 目标要求 | 必须实现接口 | 不能是 final 类 |
| 方法要求 | 无限制 | 不能代理 final 方法 |
| 性能 | 反射调用，略慢 | 直接调用父类方法，略快 |
| 依赖 | JDK 自带 | 需要 cglib 库（Spring 已内置） |
| 代理对象类型 | 接口类型 | 目标类类型 |

### 2.5.4 Spring 的默认策略

```java
// Spring 的选择逻辑（简化）
if (目标类实现了接口) {
    使用 JDK 动态代理;     // Spring 5.x 默认
} else {
    使用 CGLIB;            // 没有接口时回退
}

// Spring Boot 2.x+ 默认强制使用 CGLIB
// spring.aop.proxy-target-class=true（默认值）
```

Spring Boot 之所以默认选择 CGLIB，是因为实际开发中很多 Bean 没有接口（如 `@Controller`、`@Service`），使用 CGLIB 可以避免类型转换问题。

---

## 2.6 AOP 的边界

### 2.6.1 自调用失效问题

**这是 AOP 最常见的陷阱。** 当一个方法内部调用同类的另一个方法时，AOP 不会生效：

```java
@Service
public class PaymentService {

    @Transactional
    public void processPayment(Order order) {
        deductInventory(order);  // ❌ 自调用，@Transactional 不生效！
        chargeCustomer(order);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deductInventory(Order order) {
        // 这里的事务注解会被忽略
        // 因为调用没有经过代理对象
    }
}
```

**原因：** 自调用时，`this.deductInventory()` 直接调用原始对象的方法，绕过了 AOP 代理。

**解决方案：**

```java
// 方案一：注入自身代理
@Service
public class PaymentService {
    @Autowired
    private PaymentService self;  // 注入的是代理对象

    public void processPayment(Order order) {
        self.deductInventory(order);  // ✅ 通过代理调用
    }
}

// 方案二：从 ApplicationContext 获取
@Service
public class PaymentService implements ApplicationContextAware {
    private ApplicationContext ctx;

    public void processPayment(Order order) {
        ctx.getBean(PaymentService.class).deductInventory(order);  // ✅
    }
}

// 方案三：使用 AopContext（需要 exposeProxy=true）
@EnableAspectJAutoProxy(exposeProxy = true)
public class PaymentService {
    public void processPayment(Order order) {
        ((PaymentService) AopContext.currentProxy()).deductInventory(order);  // ✅
    }
}
```

### 2.6.2 非 public 方法无效

Spring AOP 基于代理模式，而 Java 动态代理只能代理接口方法（public），CGLIB 代理通过子类继承也无法代理 private 方法。**只有 public 方法的 AOP 通知才能可靠生效。**

```java
@Service
public class ReportService {

    @Transactional  // ⚠️ private 方法，AOP 不生效
    private void internalSave(Report report) {
        reportRepo.save(report);
    }

    @Transactional  // ⚠️ protected 方法，CGLIB 可能生效但不可靠
    protected void saveReport(Report report) {
        reportRepo.save(report);
    }

    @Transactional  // ✅ public 方法，AOP 确定生效
    public void publishReport(Report report) {
        reportRepo.save(report);
    }
}
```

### 2.6.3 过度使用 AOP 降低可读性

AOP 虽然强大，但过度使用会让代码难以理解和调试：

**反模式示例：**

```java
@Aspect
@Component
public class EverythingAspect {

    @Before("execution(* com.example..*.*(..))")  // 拦截所有方法
    public void logEverything(JoinPoint jp) {
        // 每个方法调用都打日志，日志泛滥
    }

    @Around("execution(* com.example..*.*(..))")
    public Object validateEverything(ProceedingJoinPoint pjp) throws Throwable {
        // 所有方法都做参数校验，性能损耗
        validateArgs(pjp.getArgs());
        return pjp.proceed();
    }
}
```

**合理使用 AOP 的原则：**

| 原则 | 说明 |
|------|------|
| 切入点要精确 | 使用包名 + 类名限定范围，避免 `execution(* *.*(..))` |
| 通知逻辑要简单 | 复杂逻辑放在业务方法中，AOP 只做横切关注点 |
| 避免嵌套切面 | 一个方法不要被多个切面层层拦截 |
| 优先用框架提供的切面 | @Transactional、@Cacheable 等框架注解比自定义切面更可靠 |

### 2.6.4 AOP 调试困难

由于代理的存在，堆栈信息中会出现 `$Proxy` 或 `$$EnhancerByCGLIB$$` 类名，增加调试难度：

```text
// 典型的 AOP 堆栈
at com.example.UserService$$EnhancerBySpringCGLIB$$abc123.findUser(<generated>)
at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
at com.example.OrderController.createOrder(OrderController.java:45)
```

**调试技巧：** 在 IDE 中对生成的代理类设置断点无效，应对**目标方法**设置断点，或使用条件断点过滤。

