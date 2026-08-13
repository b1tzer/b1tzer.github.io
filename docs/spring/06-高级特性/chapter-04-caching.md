# 缓存抽象

## 1. 配置

```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() {
        RedisCacheManager manager = RedisCacheManager.builder(redisConnectionFactory())
            .cacheDefaults(defaultConfig())
            .build();
        return manager;
    }
}
```

## 2. 使用

```java
@Service
public class UserService {
    @Cacheable(value = "users", key = "#id")
    public User getUser(Long id) { /* ... */ }
    
    @CachePut(value = "users", key = "#user.id")
    public User updateUser(User user) { /* ... */ }
    
    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) { /* ... */ }
    
    @Caching(evict = {
        @CacheEvict(value = "users", key = "#id"),
        @CacheEvict(value = "userList", allEntries = true)
    })
    public void clearCache(Long id) { /* ... */ }
}
```

## 3. 自定义 KeyGenerator

```java
@Bean
public KeyGenerator keyGenerator() {
    return (target, method, params) -> {
        return target.getClass().getSimpleName() + "_" + method.getName() + "_" + StringUtils.arrayToDelimitedString(params, "_");
    };
}
```

---
*待补充：更多缓存策略*
