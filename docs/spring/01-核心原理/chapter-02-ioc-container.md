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

---
*待补充：更多源码分析*
