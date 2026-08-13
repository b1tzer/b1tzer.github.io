# Bean 生命周期

## 1. 完整流程

```
实例化 → 属性填充 → Aware接口 → BeanPostProcessor.before 
→ InitializingBean → init-method → BeanPostProcessor.after 
→ 使用 → DisposableBean → destroy-method
```

## 2. 源码分析

```java
// AbstractAutowireCapableBeanFactory
protected Object doCreateBean(String beanName, RootBeanDefinition mbd, Object[] args) {
    // 1. 实例化
    BeanWrapper instanceWrapper = createBeanInstance(beanName, mbd, args);
    // 2. 属性填充
    populateBean(beanName, mbd, instanceWrapper);
    // 3. 初始化
    Object exposedObject = initializeBean(beanName, exposedObject, mbd);
    return exposedObject;
}
```

## 3. 三级缓存与循环依赖

```java
// DefaultSingletonBeanRegistry
/** 一级缓存：完成品 */
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);
/** 二级缓存：半成品（早期引用） */
private final Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);
/** 三级缓存：对象工厂 */
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);
```

### 解决流程
1. A 创建时发现依赖 B，将 A 的 ObjectFactory 放入三级缓存
2. B 创建时发现依赖 A，从三级缓存获取 A 的早期引用
3. B 完成初始化，放入一级缓存
4. A 完成初始化，放入一级缓存

## 4. 生命周期扩展点实战

### 4.1 @PostConstruct 与 @PreDestroy

```java
@Component
public class ConnectionPool {

    private List<Connection> pool;

    @PostConstruct
    public void init() {
        // 初始化连接池
        pool = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            pool.add(createConnection());
        }
        System.out.println("连接池初始化完成，共 " + pool.size() + " 个连接");
    }

    public Connection getConnection() {
        if (pool.isEmpty()) {
            throw new RuntimeException("连接池已耗尽");
        }
        return pool.remove(pool.size() - 1);
    }

    public void release(Connection conn) {
        pool.add(conn);
    }

    @PreDestroy
    public void destroy() {
        System.out.println("关闭连接池...");
        for (Connection conn : pool) {
            try {
                conn.close();
            } catch (Exception e) {
                // ignore
            }
        }
        pool.clear();
    }
}
```

### 4.2 InitializingBean 与 DisposableBean

```java
@Component
public class CacheManager implements InitializingBean, DisposableBean {

    private Map<String, Object> cache;

    @Override
    public void afterPropertiesSet() {
        // 所有属性注入完成后调用
        cache = new ConcurrentHashMap<>(256);
        System.out.println("缓存管理器初始化");
    }

    @Override
    public void destroy() {
        cache.clear();
        System.out.println("缓存管理器销毁");
    }
}
```

### 4.3 自定义 BeanPostProcessor 实现属性校验

```java
@Component
public class RequiredFieldValidator implements BeanPostProcessor {

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        // 检查所有标注了 @RequiredField 的字段是否为 null
        for (Field field : bean.getClass().getDeclaredFields()) {
            if (field.isAnnotationPresent(RequiredField.class)) {
                field.setAccessible(true);
                try {
                    Object value = field.get(bean);
                    if (value == null) {
                        throw new IllegalStateException(
                            "Bean '" + beanName + "' 的字段 '" + field.getName() + "' 不能为 null");
                    }
                } catch (IllegalAccessException e) {
                    throw new RuntimeException(e);
                }
            }
        }
        return bean;
    }
}
```

### 4.4 循环依赖的完整解决流程

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

解决过程：

```text
1. 创建 ServiceA
   ├── 实例化 ServiceA（调用构造器）
   ├── 将 ServiceA 的 ObjectFactory 放入三级缓存
   ├── 属性填充：发现依赖 ServiceB
   │
   ├── 2. 创建 ServiceB
   │   ├── 实例化 ServiceB（调用构造器）
   │   ├── 将 ServiceB 的 ObjectFactory 放入三级缓存
   │   ├── 属性填充：发现依赖 ServiceA
   │   ├── 从三级缓存获取 ServiceA 的 ObjectFactory
   │   ├── 调用 ObjectFactory.getObject() 获取 ServiceA 的早期引用
   │   ├── 将 ServiceA 的早期引用放入二级缓存
   │   ├── ServiceB 完成初始化
   │   └── ServiceB 放入一级缓存
   │
   ├── ServiceA 属性填充完成（拿到 ServiceB）
   ├── ServiceA 完成初始化
   └── ServiceA 放入一级缓存
```

**注意：** 构造器注入的循环依赖无法通过三级缓存解决，启动时会直接报错：

```text
BeanCurrentlyInCreationException: Error creating bean with name 'serviceA':
Requested bean is currently in creation: Is there an unresolvable circular reference?
```

**最佳实践：**

1. **优先使用 `@PostConstruct`** 而非 `InitializingBean`——前者不依赖 Spring API
2. **避免循环依赖**——它通常是设计问题的信号，考虑提取公共组件或使用事件解耦
3. **`BeanPostProcessor` 是 Spring 最强大的扩展点**——AOP、`@Autowired`、`@Transactional` 都基于它实现
4. **Prototype 作用域的 Bean 不参与循环依赖解决**——三级缓存只对单例 Bean 有效
