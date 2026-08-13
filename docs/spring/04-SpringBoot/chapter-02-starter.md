# Starter 机制

## 1. Starter 结构

```
my-starter/
├── src/main/java/
│   └── com/example/autoconfigure/
│       └── MyAutoConfiguration.java
├── src/main/resources/
│   └── META-INF/
│       └── spring/
│           └── org.springframework.boot.autoconfigure.AutoConfiguration.imports
└── pom.xml
```

## 2. 自定义 Starter

```java
@AutoConfiguration
@ConditionalOnClass(MyService.class)
@EnableConfigurationProperties(MyProperties.class)
public class MyAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean
    public MyService myService(MyProperties properties) {
        return new MyService(properties);
    }
}
```

## 3. spring.factories vs AutoConfiguration.imports

| 版本 | 方式 |
|------|------|
| Spring Boot 2.x | META-INF/spring.factories |
| Spring Boot 3.x | META-INF/spring/.../AutoConfiguration.imports |

---
*待补充：更多 Starter 实战*
