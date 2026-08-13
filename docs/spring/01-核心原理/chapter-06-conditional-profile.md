# 条件装配与 Profile

## 1. @Conditional

```java
public class LinuxCondition implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        return context.getEnvironment().getProperty("os.name").contains("Linux");
    }
}

@Configuration
public class AppConfig {
    @Bean
    @Conditional(LinuxCondition.class)
    public DataSource linuxDataSource() { /* Linux 数据源 */ }
}
```

## 2. 常用条件注解

| 注解 | 说明 |
|------|------|
| @ConditionalOnClass | 类路径存在指定类 |
| @ConditionalOnMissingClass | 类路径不存在指定类 |
| @ConditionalOnBean | 容器存在指定 Bean |
| @ConditionalOnMissingBean | 容器不存在指定 Bean |
| @ConditionalOnProperty | 配置属性满足条件 |
| @ConditionalOnResource | 存在指定资源文件 |

## 3. @Profile

```java
@Configuration
public class DataSourceConfig {
    @Bean
    @Profile("dev")
    public DataSource devDataSource() { /* 开发环境数据源 */ }
    
    @Bean
    @Profile("prod")
    public DataSource prodDataSource() { /* 生产环境数据源 */ }
}
```

激活方式：
```bash
java -jar app.jar --spring.profiles.active=dev
```

---
*待补充：更多条件装配场景*
