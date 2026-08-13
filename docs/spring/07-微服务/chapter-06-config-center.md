# 配置中心

## 1. Nacos Config

```yaml
spring:
  cloud:
    nacos:
      config:
        server-addr: localhost:8848
        namespace: dev
        group: DEFAULT_GROUP
        file-extension: yaml
```

## 2. 动态刷新

```java
@RefreshScope
@Configuration
public class DynamicConfig {
    @Value("${app.feature.enabled}")
    private boolean featureEnabled;
}
```

## 3. 配置优先级

Nacos > application-{profile}.yml > application.yml > bootstrap.yml

---
*待补充：更多配置中心场景*
