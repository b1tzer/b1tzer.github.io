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

---
*待补充：更多生命周期扩展点*
