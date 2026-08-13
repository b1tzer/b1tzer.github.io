# 多数据源

## 1. 配置

```yaml
spring:
  datasource:
    master:
      url: jdbc:mysql://master:3306/db
      username: root
      password: root
    slave:
      url: jdbc:mysql://slave:3306/db
      username: root
      password: root
```

## 2. 动态数据源

```java
public class DynamicDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return DataSourceContextHolder.get();
    }
}

// 使用
@Target({METHOD, TYPE})
@Retention(RUNTIME)
public @interface DS {
    String value() default "master";
}
```

## 3. 读写分离

```java
@Aspect
@Component
public class DataSourceAspect {
    @Before("@annotation(slave)")
    public void before(JoinPoint point, Slave slave) {
        DataSourceContextHolder.set("slave");
    }
    
    @After("@annotation(slave)")
    public void after(JoinPoint point, Slave slave) {
        DataSourceContextHolder.clear();
    }
}
```

---
*待补充：分库分表方案*
