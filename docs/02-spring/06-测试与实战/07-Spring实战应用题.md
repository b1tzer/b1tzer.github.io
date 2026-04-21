---
doc_id: spring-测试与实战-Spring实战应用题
title: Spring 实战应用题
---

# Spring 实战应用型问题

> 以下是面试中容易"卡住"的实战问题，考察对 Spring 原理的真实理解深度。

---

## 🔥 事务相关

### Q1：`@Transactional` 加了，但数据库没有回滚，你怎么排查？

排查思路（按优先级）：

1. **同类调用**：`this.methodA()` 调用同类的 `@Transactional` 方法，绕过代理，事务不生效
2. **异常被吞**：方法内部 `try-catch` 捕获了异常但没有重新抛出
3. **异常类型不对**：默认只回滚 `RuntimeException`，受检异常需加 `rollbackFor = Exception.class`
4. **方法非 public**：Spring AOP 只拦截 public 方法
5. **数据库引擎不支持事务**：MySQL 的 MyISAM 引擎不支持事务，需用 InnoDB
6. **多数据源问题**：事务管理器和数据源不匹配

```java
// ❌ 错误：同类调用，事务不生效
@Service
public class OrderService {
    public void createOrder() {
        this.saveOrder(); // this 调用，绕过代理
    }

    @Transactional
    public void saveOrder() { ... }
}

// ✅ 正确：注入自身代理
@Service
public class OrderService {
    @Autowired
    private OrderService self; // 注入代理对象

    public void createOrder() {
        self.saveOrder(); // 通过代理调用
    }

    @Transactional
    public void saveOrder() { ... }
}
```

---

### Q2：事务传播行为 `REQUIRED` 和 `REQUIRES_NEW` 的区别？实际场景怎么选？

| 传播行为 | 含义 | 适用场景 |
|---------|------|---------|
| `REQUIRED`（默认） | 有事务就加入，没有就新建 | 大多数业务方法，保证原子性 |
| `REQUIRES_NEW` | 总是新建事务，挂起外层事务 | 操作日志、审计记录（不受主业务回滚影响） |
| `NESTED` | 嵌套事务，外层回滚内层也回滚，内层回滚不影响外层 | 批量操作中部分失败可回滚 |
| `NOT_SUPPORTED` | 以非事务方式执行，挂起当前事务 | 查询操作，避免长事务 |

**实战场景**：下单时记录操作日志，日志必须保存成功（即使下单失败），用 `REQUIRES_NEW`：

```java
@Transactional
public void createOrder(Order order) {
    orderDao.save(order);
    logService.saveLog("创建订单"); // 即使 createOrder 回滚，日志也要保存
    // 如果这里抛异常，order 回滚，但 log 已提交
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveLog(String msg) {
    logDao.save(new Log(msg));
}
```

---

### Q3：长事务有什么危害？如何优化？

**危害**：
- 数据库连接长时间占用，连接池耗尽
- 锁持有时间长，并发性能下降，容易死锁
- 大量 undo log 积压，影响 MVCC 性能

**优化方案**：
1. **缩小事务范围**：只在真正需要原子性的代码上加事务，查询操作移出事务
2. **异步处理**：将耗时操作（发短信、调第三方接口）移到事务外或异步执行
3. **批量操作分批提交**：大批量数据分批处理，每批一个事务
4. **`@Transactional(readOnly = true)`**：只读事务，数据库可做优化

```java
// ❌ 长事务：HTTP 调用在事务内
@Transactional
public void processOrder(Order order) {
    orderDao.save(order);
    httpClient.notifyWarehouse(order); // 网络调用可能很慢！
    inventoryDao.deduct(order);
}

// ✅ 优化：HTTP 调用移到事务外
public void processOrder(Order order) {
    doSaveOrder(order); // 事务内只做 DB 操作
    httpClient.notifyWarehouse(order); // 事务外执行
}

@Transactional
public void doSaveOrder(Order order) {
    orderDao.save(order);
    inventoryDao.deduct(order);
}
```

---

## 🔥 AOP 相关

### Q4：AOP 切面不生效，你的排查步骤是什么？

```
排查清单：
1. 是否 this 同类调用？           → 注入自身代理或重构
2. 方法是否 public？              → 改为 public
3. 类是否被 Spring 管理？         → 检查 @Component / @Service 等注解
4. 切点表达式是否正确？           → 用 @Pointcut 单独测试
5. 是否有多个代理叠加导致顺序问题？→ 用 @Order 控制切面顺序
6. Spring Boot 版本问题？         → 2.x 后默认 CGLIB，final 类/方法无法代理
```

---

### Q5：JDK 动态代理和 CGLIB 的区别？Spring 什么时候用哪个？

| 对比项 | JDK 动态代理 | CGLIB |
|-------|------------|-------|
| 要求 | 目标类必须实现接口 | 无需接口，生成子类 |
| 原理 | 反射调用 `InvocationHandler` | 字节码生成（ASM），继承目标类 |
| 限制 | 只能代理接口方法 | `final` 类和方法无法代理 |
| 性能 | 创建快，调用稍慢 | 创建慢，调用快（方法索引） |

**Spring 的选择策略**：
- Spring Boot 2.x 后**默认使用 CGLIB**（`spring.aop.proxy-target-class=true`）
- 如果目标类实现了接口且配置了 `proxy-target-class=false`，则用 JDK 代理
- `@EnableAspectJAutoProxy(proxyTargetClass = true)` 强制使用 CGLIB

---

## 🔥 Bean 生命周期相关

### Q6：Bean 初始化的几种方式，执行顺序是什么？

```java
@Component
public class MyBean implements InitializingBean {

    public MyBean() {
        System.out.println("1. 构造器");
    }

    @Autowired
    public void setXxx(Xxx xxx) {
        System.out.println("2. 依赖注入");
    }

    @PostConstruct
    public void postConstruct() {
        System.out.println("3. @PostConstruct");
    }

    @Override
    public void afterPropertiesSet() {
        System.out.println("4. InitializingBean.afterPropertiesSet");
    }

    // @Bean(initMethod = "init") 指定的方法
    public void init() {
        System.out.println("5. initMethod");
    }
}
```

**执行顺序**：构造器 → 依赖注入 → `@PostConstruct` → `afterPropertiesSet` → `initMethod`

**销毁顺序**：`@PreDestroy` → `DisposableBean.destroy` → `destroyMethod`

---

### Q7：`BeanPostProcessor` 有什么用？举个实际例子。

`BeanPostProcessor` 在每个 Bean 初始化前后执行，是 Spring 扩展的核心机制：

| 实际应用 | 说明 |
|---------|------|
| AOP 代理创建 | `AnnotationAwareAspectJAutoProxyCreator` 在 `postProcessAfterInitialization` 中创建代理 |
| `@Autowired` 注入 | `AutowiredAnnotationBeanPostProcessor` 处理字段注入 |
| `@Value` 解析 | 解析配置文件中的占位符 |
| 自定义校验 | 可以在 Bean 初始化后校验配置是否合法 |

```java
// 自定义 BeanPostProcessor：打印所有 Bean 初始化耗时
@Component
public class TimingBeanPostProcessor implements BeanPostProcessor {
    private Map<String, Long> startTimes = new ConcurrentHashMap<>();

    @Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) {
        startTimes.put(beanName, System.currentTimeMillis());
        return bean;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        Long start = startTimes.remove(beanName);
        if (start != null) {
            long cost = System.currentTimeMillis() - start;
            if (cost > 100) {
                System.out.println("慢 Bean: " + beanName + " 耗时 " + cost + "ms");
            }
        }
        return bean;
    }
}
```

---

## 🔥 Spring Boot 相关

### Q8：Spring Boot 启动慢，如何排查和优化？

**排查方式**：
```java
// 方式1：开启启动耗时日志
// application.properties
spring.jmx.enabled=false
logging.level.org.springframework=DEBUG

// 方式2：使用 ApplicationStartup 记录各阶段耗时（Spring Boot 2.4+）
SpringApplication app = new SpringApplication(MyApp.class);
app.setApplicationStartup(new BufferingApplicationStartup(2048));
app.run(args);
```

**常见优化手段**：
1. **懒加载**：`spring.main.lazy-initialization=true`，按需加载 Bean
2. **排除不需要的自动配置**：`@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})`
3. **减少包扫描范围**：精确指定 `@ComponentScan` 的 basePackages
4. **使用 GraalVM Native Image**：AOT 编译，启动时间从秒级降到毫秒级

---

### Q9：如何自定义一个 Spring Boot Starter？

**核心步骤**：

```
my-spring-boot-starter/
├── src/main/java/
│   └── com/example/
│       ├── MyProperties.java        # 配置属性类
│       ├── MyService.java           # 核心功能类
│       └── MyAutoConfiguration.java # 自动配置类
└── src/main/resources/
    └── META-INF/
        └── spring/
            └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
                                     # Spring Boot 3.x 注册方式
```

```java
// 1. 配置属性
@ConfigurationProperties(prefix = "my.service")
public class MyProperties {
    private String url = "http://default-url";
    // getter/setter
}

// 2. 自动配置类
@AutoConfiguration
@EnableConfigurationProperties(MyProperties.class)
@ConditionalOnClass(MyService.class)          // 类路径有 MyService 才生效
@ConditionalOnMissingBean(MyService.class)    // 用户没有自定义才生效
public class MyAutoConfiguration {
    @Bean
    public MyService myService(MyProperties props) {
        return new MyService(props.getUrl());
    }
}

// 3. 注册（Spring Boot 3.x）
// META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
// com.example.MyAutoConfiguration
```

---

## 🔥 循环依赖相关

> 📖 **三级缓存机制题**（"三级缓存各存什么？为什么需要第三级？构造器为什么不能解决循环依赖？"）已在 [Bean 生命周期与循环依赖 §6 + §8 Q3/Q4/Q5](@spring-核心基础-Bean生命周期与循环依赖) 给出源码级答案，本文不再重复，专注"**生产排障 + 业务选型**"视角。

### Q10：Spring Boot 3.x 升级后启动报 `BeanCurrentlyInCreationException`，怎么排查并解决？

**症状定位**：

```
Error creating bean with name 'orderService':
Requested bean is currently in creation: Is there an unresolvable circular reference?
```

**根因**：Spring 6 / Boot 3 将 `spring.main.allow-circular-references` 默认值由 `true` 改为 `false`，Boot 2.x 时期"靠三级缓存悄悄跑起来"的字段/Setter 循环依赖集中暴露。

**排查 checklist**：

- [ ] **第一步：定位环**——启动日志会打印 `The dependencies of some of the beans in the application context form a cycle`，跟着 `┌─────┐` 环形箭头找到所有参与者
- [ ] **第二步：确认注入方式**——构造器注入的环 vs 字段/Setter 注入的环，前者无法靠开关救，后者可以临时救
- [ ] **第三步：判断是不是"真环"还是"假环"**——有时候是 `@Configuration` 类里 `@Bean` 方法互相调用造成的伪环，改成参数注入即可
- [ ] **第四步：按优先级选方案**（见下表）

**解决方案选型矩阵**：

| 方案 | 适用场景 | 代价 | 是否推荐 |
| :-- | :-- | :-- | :-- |
| **重构：提取公共依赖** `A→C←B` | 业务上两者共享某块逻辑 | 需要改动多个类 | ⭐⭐⭐ 首选 |
| **重构：事件解耦** `ApplicationEventPublisher` | 发布-订阅类单向通知 | 同步/异步语义需要评估 | ⭐⭐⭐ 首选 |
| **`@Lazy` 打破构造器环** | 历史遗留构造器注入 | 注入代理，首次调用才解析 | ⭐⭐ 权宜 |
| **`allow-circular-references=true`** | 大规模遗留代码临时上线 | 掩盖设计问题、后续技术债 | ⭐ 临时救场 |

```yaml
# 临时救场配置（务必同步打日志 + 提技术债工单）
spring:
  main:
    allow-circular-references: true
```

> 📖 三级缓存**为什么**能（部分）解决循环依赖、构造器**为什么**不行的源码机制，见 [Bean 生命周期与循环依赖 §6](@spring-核心基础-Bean生命周期与循环依赖)。本题只给工程决策。

---

## 🔥 综合实战

### Q11：线上 OOM，排查发现是 Spring Bean 泄漏，可能的原因有哪些？

1. **`prototype` Bean 注入到 `singleton` Bean**：singleton 持有 prototype 引用，prototype 无法被 GC
2. **`ApplicationContext` 未关闭**：在测试或批处理中手动创建了 Context 但未关闭
3. **`@EventListener` 持有大对象引用**：事件监听器持有大量数据未释放
4. **ThreadLocal 未清理**：在 Bean 中使用 ThreadLocal 但未调用 `remove()`

```java
// ❌ prototype Bean 泄漏
@Service // singleton
public class SingletonService {
    @Autowired
    private PrototypeBean prototypeBean; // 只注入一次，永远是同一个实例！
}

// ✅ 正确：通过 ApplicationContext 每次获取新实例
@Service
public class SingletonService {
    @Autowired
    private ApplicationContext context;

    public void doWork() {
        PrototypeBean bean = context.getBean(PrototypeBean.class); // 每次新实例
    }
}
```

---

### Q12：如何实现动态注册 Bean（运行时向容器添加 Bean）？

```java
@Component
public class DynamicBeanRegistrar implements ApplicationContextAware {
    private ConfigurableApplicationContext context;

    @Override
    public void setApplicationContext(ApplicationContext ctx) {
        this.context = (ConfigurableApplicationContext) ctx;
    }

    public void registerBean(String beanName, Class<?> beanClass) {
        DefaultListableBeanFactory factory =
            (DefaultListableBeanFactory) context.getBeanFactory();

        BeanDefinitionBuilder builder =
            BeanDefinitionBuilder.genericBeanDefinition(beanClass);
        factory.registerBeanDefinition(beanName, builder.getBeanDefinition());
    }
}
```