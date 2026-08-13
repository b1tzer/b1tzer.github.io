# IoC 容器

## 1. 什么是 IoC

控制反转（Inversion of Control）是一种设计原则，将对象的创建和依赖管理交给容器。

## 2. BeanFactory vs ApplicationContext

| 特性 | BeanFactory | ApplicationContext |
|------|-------------|-------------------|
| 懒加载 | 默认懒加载 | 默认预加载 |
| 国际化 | 不支持 | 支持 |
| 事件发布 | 不支持 | 支持 |
| AOP | 需手动配置 | 自动集成 |

## 3. 容器初始化流程

```java
// 1. 加载配置
ClassPathXmlApplicationContext context = new ClassPathXmlApplicationContext("beans.xml");
// 2. 获取 Bean
UserService userService = context.getBean(UserService.class);
```

## 4. BeanDefinition

BeanDefinition 是 Bean 的元数据，包含：
- beanClassName：Bean 的类名
- scope：作用域（singleton/prototype）
- lazyInit：是否懒加载
- dependsOn：依赖的 Bean

## 5. 条件装配

```java
@Configuration
public class AppConfig {
    @Bean
    @ConditionalOnClass(name = "com.mysql.cj.jdbc.Driver")
    public DataSource dataSource() {
        return new MysqlDataSource();
    }
}
```

## 6. 容器启动源码分析

### 6.1 refresh() 方法

`AbstractApplicationContext#refresh()` 是容器启动的核心方法，包含 12 个步骤：

```java
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // 1. 准备刷新：设置启动时间、active 标志
        prepareRefresh();

        // 2. 创建 BeanFactory（加载 BeanDefinition）
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

        // 3. 准备 BeanFactory：设置类加载器、SpEL 解析器、属性编辑器
        prepareBeanFactory(beanFactory);

        try {
            // 4. 子类扩展点：BeanFactoryPostProcessor
            postProcessBeanFactory(beanFactory);

            // 5. 执行 BeanFactoryPostProcessor（修改 BeanDefinition）
            invokeBeanFactoryPostProcessors(beanFactory);

            // 6. 注册 BeanPostProcessor（拦截 Bean 创建）
            registerBeanPostProcessors(beanFactory);

            // 7. 初始化 MessageSource（国际化）
            initMessageSource();

            // 8. 初始化 ApplicationEventMulticaster（事件广播）
            initApplicationEventMulticaster();

            // 9. 子类扩展点：初始化特殊 Bean
            onRefresh();

            // 10. 注册事件监听器
            registerListeners();

            // 11. 实例化所有非懒加载的单例 Bean
            finishBeanFactoryInitialization(beanFactory);

            // 12. 完成刷新：发布 ContextRefreshedEvent
            finishRefresh();
        } catch (BeansException ex) {
            destroyBeans();
            cancelRefresh(ex);
            throw ex;
        }
    }
}
```

### 6.2 BeanFactoryPostProcessor

`BeanFactoryPostProcessor` 可以在 Bean 实例化之前修改 BeanDefinition 元数据：

```java
@Component
public class CustomBeanFactoryPostProcessor implements BeanFactoryPostProcessor {

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
        // 获取指定 Bean 的定义
        BeanDefinition bd = beanFactory.getBeanDefinition("dataSource");

        // 修改属性值
        MutablePropertyValues pvs = bd.getPropertyValues();
        pvs.addPropertyValue("maxPoolSize", "20");

        // 修改作用域
        bd.setScope("prototype");

        System.out.println("BeanFactoryPostProcessor 修改了 dataSource 的定义");
    }
}
```

### 6.3 BeanDefinition 的注册流程

```java
// 手动注册 BeanDefinition（编程方式）
AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();

AbstractBeanDefinition bd = BeanDefinitionBuilder
    .rootBeanDefinition(UserService.class)
    .setScope("singleton")
    .addConstructorArgReference("userRepository")
    .addPropertyValue("maxRetries", 3)
    .getBeanDefinition();

context.registerBeanDefinition("userService", bd);
context.refresh();

UserService userService = context.getBean(UserService.class);
```

### 6.4 容器关闭流程

```java
// AbstractApplicationContext#doClose()
protected void doClose() {
    // 1. 设置 active = false
    // 2. 发布 ContextClosedEvent
    // 3. 销毁所有单例 Bean（调用 @PreDestroy、DisposableBean）
    // 4. 关闭 BeanFactory
    // 5. 设置 closed = true
}
```

**最佳实践：**

1. **避免在 BeanFactoryPostProcessor 中依赖其他 Bean**——此时 Bean 尚未实例化，注入可能失败
2. **BeanFactoryPostProcessor 的执行顺序**可以通过 `Ordered` 接口或 `@Order` 控制
3. **生产环境不要使用 `ClassPathXmlApplicationContext`**——Spring Boot 的自动配置容器已经帮你处理了所有初始化细节
