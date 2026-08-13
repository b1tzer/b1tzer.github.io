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

## 4. 条件装配高级场景

### 4.1 自定义条件注解

```java
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Conditional(OnCustomCondition.class)
public @interface ConditionalOnCustom {
    String value();
}

public class OnCustomCondition implements Condition {

    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        Map<String, Object> attributes = metadata.getAnnotationAttributes(
            ConditionalOnCustom.class.getName());
        String value = (String) attributes.get("value");

        String featureEnabled = context.getEnvironment()
            .getProperty("feature." + value + ".enabled");
        return "true".equalsIgnoreCase(featureEnabled);
    }
}

@Configuration
public class FeatureConfig {

    @Bean
    @ConditionalOnCustom("payment")
    public PaymentGateway paymentGateway() {
        return new AlipayGateway();
    }
}
```

### 4.2 多条件组合

```java
@Configuration
public class DataSourceAutoConfig {

    @Bean
    @ConditionalOnClass(name = "com.mysql.cj.jdbc.Driver")
    @ConditionalOnProperty(prefix = "spring.datasource", name = "url")
    @ConditionalOnMissingBean(DataSource.class)
    public DataSource mysqlDataSource(DataSourceProperties properties) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(properties.getUrl());
        ds.setUsername(properties.getUsername());
        ds.setPassword(properties.getPassword());
        return ds;
    }
}
```

### 4.3 Profile 高级用法

```java
// Profile 排除
@Configuration
@Profile("!dev")  // 非开发环境生效
public class NonDevConfig {
    @Bean
    public CacheManager distributedCacheManager() {
        return new RedisCacheManager();
    }
}

// Profile 分组
@Configuration
@Profile("production")
public class ProductionConfig {
    @Bean
    public DataSource dataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(System.getenv("DB_URL"));
        ds.setMaximumPoolSize(20);
        return ds;
    }
}
```

### 4.4 条件装配在自动配置中的应用

```java
@AutoConfiguration
@ConditionalOnClass(DataSource.class)
public class MyBatisAutoConfiguration {

    @Bean
    @ConditionalOnSingleCandidate(DataSource.class)
    @ConditionalOnMissingBean
    public SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
        SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
        factory.setDataSource(dataSource);
        factory.setMapperLocations(
            new PathMatchingResourcePatternResolver()
                .getResources("classpath:mapper/**/*.xml"));
        return factory.getObject();
    }
}
```

**最佳实践：**

1. **用 `@ConditionalOnMissingBean` 实现"用户优先"**——自动配置只在用户未自定义时生效
2. **Profile 命名规范**——`dev`、`test`、`staging`、`prod`，不要自造名称
3. **环境变量优先于配置文件**——敏感信息通过环境变量注入
4. **用 `@ConditionalOnProperty` 实现功能开关**——运行时控制功能启停，无需重新部署
