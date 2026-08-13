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

## 4. 缓存高级策略

### 4.1 缓存穿透、击穿、雪崩防护

```java
@Service
public class ProductService {

    // 布隆过滤器防缓存穿透
    private BloomFilter<Long> productBloomFilter;

    @PostConstruct
    public void init() {
        // 初始化布隆过滤器
        productBloomFilter = BloomFilter.create(
            Funnels.longFunnel(), 1000000, 0.01);
        productRepository.findAll().forEach(p ->
            productBloomFilter.put(p.getId()));
    }

    // 防穿透：布隆过滤器 + 空值缓存
    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public Product getProduct(Long id) {
        // 布隆过滤器快速判断
        if (!productBloomFilter.mightContain(id)) {
            return null;  // 一定不存在，不查库
        }
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) {
            // 缓存空值，防止穿透（短期缓存）
            cacheNullValue(id);
        }
        return product;
    }

    // 防击穿：互斥锁
    @Cacheable(value = "hotProducts", key = "#id")
    public Product getHotProduct(Long id) {
        String lockKey = "lock:product:" + id;
        // 获取分布式锁
        if (distributedLock.tryLock(lockKey, 3, TimeUnit.SECONDS)) {
            try {
                return productRepository.findById(id).orElseThrow();
            } finally {
                distributedLock.unlock(lockKey);
            }
        }
        return null;  // 其他线程正在重建缓存
    }
}
```

### 4.2 多级缓存架构

```java
@Configuration
@EnableCaching
class MultiLevelCacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisFactory) {
        // L1: Caffeine 本地缓存（快速，容量小）
        CaffeineCacheManager caffeineCacheManager = new CaffeineCacheManager();
        caffeineCacheManager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(10000)
            .expireAfterWrite(Duration.ofMinutes(5)));

        // L2: Redis 分布式缓存（容量大，跨实例共享）
        RedisCacheManager redisCacheManager = RedisCacheManager.builder(redisFactory)
            .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30))
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                    .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                    .fromSerializer(new GenericJackson2JsonRedisSerializer())))
            .build();

        // 组合缓存管理器
        CompositeCacheManager compositeManager = new CompositeCacheManager();
        compositeManager.setCacheManagers(List.of(caffeineCacheManager, redisCacheManager));
        compositeManager.setFallbackToNoOpCache(false);
        return compositeManager;
    }
}
```

### 4.3 缓存一致性方案

```java
@Service
public class UserCacheService {

    // 先更新数据库，再删除缓存（Cache Aside 模式）
    @Transactional
    public User updateUser(Long id, UserUpdateDTO dto) {
        User user = userRepository.findById(id).orElseThrow();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        userRepository.save(user);

        // 事务提交后删除缓存
        return user;
    }

    @CacheEvict(value = "users", key = "#id")
    public void evictUserCache(Long id) {
        // 清除缓存
    }
}

// 使用 @CacheEvict 的 allEntries 清除整个缓存区域
@CacheEvict(value = "userList", allEntries = true)
public void refreshAllUsers() {
    // 清除所有用户列表缓存
}
```

### 4.4 缓存监控

```java
@Component
public class CacheMetrics {

    @Autowired
    private CacheManager cacheManager;

    // 定时记录缓存统计
    @Scheduled(fixedRate = 60000)
    public void reportCacheStats() {
        cacheManager.getCacheNames().forEach(name -> {
            Cache cache = cacheManager.getCache(name);
            if (cache instanceof RedisCache redisCache) {
                // 获取 Redis 缓存统计
                log.info("缓存 [{}] 统计: nativeCache={}", name, redisCache.getNativeCache());
            }
        });
    }
}
```

**最佳实践：**

1. **先更新 DB，再删缓存**——Cache Aside 模式是业界主流方案
2. **缓存过期时间加随机值**——避免大量缓存同时过期（缓存雪崩）
3. **热数据用本地缓存**——Caffeine 比 Redis 快 10 倍以上
4. **缓存 key 命名规范**——`业务:对象:ID`，如 `user:detail:10086`
5. **监控缓存命中率**——命中率低于 80% 说明缓存策略需要优化
