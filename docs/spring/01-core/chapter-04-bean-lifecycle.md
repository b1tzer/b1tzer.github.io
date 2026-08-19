# 循环依赖与三级缓存

> 两个 Bean 互相依赖，Spring 启动时抛 `BeanCurrentlyInCreationException`。更隐蔽的是加了 AOP 之后，循环依赖"看似解决"——Bean 建出来了，注解却不生效。这一章从报错追到 `DefaultSingletonBeanRegistry` 的三个 Map，说清楚 Spring 怎么解开这个结，以及哪几种结它解不开。

::: warning 版本锚点
Spring Boot 2.6 起默认**禁止**循环依赖：`spring.main.allow-circular-references` 默认为 `false`，遇到循环依赖直接启动报错。本节讲的「三级缓存解决循环依赖」只有在显式开启 `allow-circular-references=true` 后才生效。
:::

---

## 1. 先看两个事故现场

### 1.1 构造器循环依赖：启动就报错

```java
@Service
public class ServiceA {
    private final ServiceB b;
    public ServiceA(ServiceB b) { this.b = b; }
}

@Service
public class ServiceB {
    private final ServiceA a;
    public ServiceB(ServiceA a) { this.a = a; }
}
```

启动直接报错：

```text
BeanCurrentlyInCreationException: Error creating bean with name 'serviceA':
Requested bean is currently in creation: Is there an unresolvable circular reference?
```

### 1.2 @Async + 循环依赖：注解悄悄失效

字段注入能"解开"循环依赖，但注入的可能是未经代理的原始对象：

```java
@Service
public class OrderService {
    @Autowired
    private UserService userService;

    @Async
    public void sendNotification() { /* 异步发送 */ }
}

@Service
public class UserService {
    @Autowired
    private OrderService orderService;
}
```

启动不报错，两个 Bean 都能建出来。但 `UserService` 里注入的 `orderService` 是原始对象，`sendNotification()` 的 `@Async` 不生效——调用变成同步执行。这比直接报错更危险，因为它不炸，只悄悄错。

---

## 2. Bean 创建的三步

理解循环依赖之前，先记住 Bean 创建分三步，顺序不能乱：

```text
1. 实例化     new 出对象，字段还是 null
2. 属性填充   注入依赖（这一步才去容器里拿别的 Bean）
3. 初始化     回调 Aware、@PostConstruct，最后做 AOP 代理
```

循环依赖卡在第 2 步：`ServiceA` 填充 `serviceB` 时发现 `ServiceB` 还没好，转去创建 `ServiceB`；`ServiceB` 填充 `serviceA` 时又发现 `ServiceA` 还在创建中——死结。

Spring 的解法是**提前暴露**：在第 1 步实例化完成后、第 2 步填充之前，先把半成品的引用存起来，让别的 Bean 能先拿到它。

---

## 3. 三级缓存的数据结构

提前暴露的引用存在三个 Map 里，定义在 `DefaultSingletonBeanRegistry`：

```java
/** 一级缓存：成品 Bean（完整可用） */
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

/** 二级缓存：半成品（提前暴露、已确定引用的对象） */
private final Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);

/** 三级缓存：对象工厂（能产出半成品的工厂） */
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
```

三者的流转关系：

```text
singletonFactories（三级）  存 ObjectFactory，延迟生产半成品
        │ getObject() 触发
        ▼
earlySingletonObjects（二级）存半成品引用，避免重复生产
        │ 初始化完成后
        ▼
singletonObjects（一级）    存最终成品
```

---

## 4. 源码链路：getSingleton 的双层检查

`getSingleton(String beanName, boolean allowEarlyReference)` 是取 Bean 的入口，依次查三级缓存（注释为讲解所加）：

```java
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    // 一级：成品，直接返回
    Object singletonObject = this.singletonObjects.get(beanName);
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        // 二级：半成品，已提前暴露
        singletonObject = this.earlySingletonObjects.get(beanName);
        if (singletonObject == null && allowEarlyReference) {
            synchronized (this.singletonObjects) {
                singletonObject = this.singletonObjects.get(beanName);
                if (singletonObject == null) {
                    singletonObject = this.earlySingletonObjects.get(beanName);
                    if (singletonObject == null) {
                        // 三级：拿到工厂，生产半成品，并升到二级
                        ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
                        if (singletonFactory != null) {
                            singletonObject = singletonFactory.getObject();
                            this.earlySingletonObjects.put(beanName, singletonObject);
                            this.singletonFactories.remove(beanName);
                        }
                    }
                }
            }
        }
    }
    return singletonObject;
}
```

这段代码回答了一个问题：**为什么三级缓存存的是 `ObjectFactory` 而不是对象本身**。因为拿到工厂后，Spring 会调用 `getObject()` 生产半成品，并立即把它从三级升到二级——半成品只生产一次，保证单例。

实例化后往三级缓存塞工厂的动作在 `doCreateBean` 里：

```java
// AbstractAutowireCapableBeanFactory#doCreateBean 节选
protected Object doCreateBean(String beanName, RootBeanDefinition mbd, Object[] args) {
    // 1. 实例化
    BeanWrapper instanceWrapper = createBeanInstance(beanName, mbd, args);

    // 提前暴露：把工厂放进三级缓存（仅单例才暴露）
    boolean earlySingletonExposure = (mbd.isSingleton()
            && this.allowCircularReferences
            && isSingletonCurrentlyInCreation(beanName));
    if (earlySingletonExposure) {
        addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
    }

    // 2. 属性填充
    populateBean(beanName, mbd, instanceWrapper);
    // 3. 初始化（AOP 代理在这里创建）
    Object exposedObject = initializeBean(beanName, exposedObject, mbd);
    // ...
}
```

---

## 5. 为什么是三级，不是两级

关键在 `getEarlyBeanReference`。这个工厂方法不只是返回裸对象，它会判断这个 Bean 需不需要 AOP 代理，需要就提前创建代理：

```java
// AbstractAutoProxyCreator#getEarlyBeanReference
public Object getEarlyBeanReference(Object bean, String beanName) {
    this.earlyProxyReferences.put(cacheKey, bean);
    return wrapIfNecessary(bean, beanName, cacheKey);  // 需要代理就返回代理对象
}
```

AOP 代理的正常时机是第 3 步初始化之后，但循环依赖要求在第 2 步填充时就拿到引用。这两个时机冲突了：

- 如果只有两级缓存、在第 1 步就把代理对象放进二级缓存，那所有 Bean 都要在实例化后立即做代理，即使没有循环依赖——违背 Spring「代理留在初始化最后」的设计。
- 用三级缓存的 `ObjectFactory` 把「要不要代理、何时代理」推迟到「真的有人来拿」的那一刻，只有发生循环依赖时才提前触发代理。

这就是三级缓存存在的真正原因：**不是为提高效率，是为了把 AOP 代理的决策推迟到不得不做的时候**。这也解释了 1.2 的 `@Async` 失效——`AsyncAnnotationBeanPostProcessor` 没有重写 `getEarlyBeanReference`，提前暴露时拿到的是裸对象，代理没提前生成。

---

## 6. 工程红线

| 场景 | 结果 | 原因 |
| :-- | :-- | :-- |
| 全是构造器注入 | ❌ 启动报错 | 实例化阶段就要依赖，对象还没暴露 |
| 字段 / Setter 注入 | ✅ 可解 | 实例化完成、提前暴露之后才填充 |
| prototype 作用域 | ❌ 不参与 | 三级缓存只对单例生效 |
| `@Transactional` / `@Aspect` 循环依赖 | ✅ 可解 | `AbstractAutoProxyCreator` 会提前代理 |
| `@Async` 循环依赖 | ❌ 代理失效 | `AsyncAnnotationBeanPostProcessor` 没重写 `getEarlyBeanReference` |

两条结论：循环依赖能靠三级缓存解决，但有注入方式和作用域的严格前提；**能解不等于该用**——循环依赖通常是设计坏味道，优先重构（提取公共组件、事件解耦），而不是开启 `allow-circular-references` 硬扛。

