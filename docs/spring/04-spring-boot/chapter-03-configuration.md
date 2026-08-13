# 外部化配置

## 1. 配置优先级

命令行参数 > 系统环境变量 > application-{profile}.yml > application.yml > @PropertySource

## 2. 多环境 Profile

```yaml
# application.yml
spring:
  profiles:
    active: dev

# application-dev.yml
server:
  port: 8080

# application-prod.yml
server:
  port: 80
```

## 3. 配置加密

```java
@Configuration
public class EncryptConfig {
    @Bean
    public EnvironmentPostProcessor environmentPostProcessor() {
        return new EncryptEnvironmentPostProcessor();
    }
}
```

## 4. 配置绑定

```java
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private String name;
    private List<String> servers;
    // getters/setters
}
```

---
*待补充：更多配置场景*
