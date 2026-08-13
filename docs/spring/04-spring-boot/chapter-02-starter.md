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

## 4. Starter 实战

### 4.1 自定义 Starter 完整示例（分布式锁）

```java
// 锁服务接口
public interface DistributedLock {
    boolean tryLock(String key, long timeout, TimeUnit unit);
    void unlock(String key);
}

// 基于 Redis 的实现
public class RedisDistributedLock implements DistributedLock {

    private final StringRedisTemplate redisTemplate;

    public RedisDistributedLock(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean tryLock(String key, long timeout, TimeUnit unit) {
        return Boolean.TRUE.equals(redisTemplate.opsForValue()
            .setIfAbsent("lock:" + key, "1", timeout, unit));
    }

    @Override
    public void unlock(String key) {
        redisTemplate.delete("lock:" + key);
    }
}
```

```java
// 属性配置类
@ConfigurationProperties(prefix = "distributed.lock")
public class DistributedLockProperties {

    /** 锁前缀 */
    private String prefix = "dl:";

    /** 默认超时时间（秒） */
    private long defaultTimeout = 30;

    // getter/setter
}
```

```java
// 自动配置类
@AutoConfiguration(after = RedisAutoConfiguration.class)
@ConditionalOnClass(StringRedisTemplate.class)
@EnableConfigurationProperties(DistributedLockProperties.class)
public class DistributedLockAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DistributedLock distributedLock(StringRedisTemplate redisTemplate) {
        return new RedisDistributedLock(redisTemplate);
    }
}
```

注册文件 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`：

```text
com.example.autoconfigure.DistributedLockAutoConfiguration
```

Maven 配置：

```xml
<!-- distributed-lock-spring-boot-starter/pom.xml -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-autoconfigure</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-configuration-processor</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

使用方只需一行依赖：

```xml
<dependency>
    <groupId>com.example</groupId>
    <artifactId>distributed-lock-spring-boot-starter</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 4.2 Starter 的自动配置测试

```java
@SpringBootTest
@Import(DistributedLockAutoConfiguration.class)
class DistributedLockAutoConfigurationTest {

    @Autowired
    private ApplicationContext context;

    @Test
    void shouldCreateLockBean() {
        assertTrue(context.containsBean("distributedLock"));
        assertInstanceOf(RedisDistributedLock.class, context.getBean(DistributedLock.class));
    }

    @Test
    void shouldNotCreateWhenRedisTemplateMissing() {
        // 模拟没有 RedisTemplate 的情况
        AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext();
        ctx.register(DistributedLockAutoConfiguration.class);
        ctx.refresh();
        assertFalse(ctx.containsBean("distributedLock"));
    }
}
```

### 4.3 spring.factories（Spring Boot 2.x 兼容）

```properties
# META-INF/spring.factories
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
  com.example.autoconfigure.DistributedLockAutoConfiguration
```

**最佳实践：**

1. **Starter 只做依赖聚合**——不要在 Starter 模块中写代码，逻辑放在 autoconfigure 模块
2. **`@ConditionalOnMissingBean` 是标配**——让用户可以轻松覆盖默认实现
3. **提供配置元数据**——`spring-boot-configuration-processor` 自动生成 `spring-configuration-metadata.json`，IDE 可以提示配置项
4. **测试自动配置**——确保条件注解正确工作，不会误注册 Bean
