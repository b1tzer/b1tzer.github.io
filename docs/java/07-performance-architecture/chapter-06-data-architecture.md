# 第6章 数据架构：缓存与大规模数据

> 当数据库扛不住流量时，第一反应是加缓存；当单库扛不住数据量时，第一反应是分库分表。但缓存带来一致性问题，分库分表带来复杂度爆炸。本章从 Java 缓存体系出发，系统讲解缓存策略、经典问题、分库分表、冷热分离和多数据源一致性，帮你构建面对大规模数据的完整技术栈。

---

## 6.1 Java 缓存体系

### 6.1.1 本地缓存 vs 分布式缓存

| 维度 | 本地缓存 | 分布式缓存 |
|------|---------|-----------|
| 存储位置 | JVM 堆内存 | 独立的缓存服务（Redis/Memcached） |
| 访问速度 | 纳秒级 | 毫秒级（网络 IO） |
| 容量 | 受 JVM 堆限制（通常 GB 级） | 可扩展到 TB 级 |
| 一致性 | 单实例内一致 | 多实例间需要同步策略 |
| 典型实现 | Caffeine、Guava Cache | Redis、Memcached |
| 适用场景 | 热点数据、配置信息 | 共享数据、会话、分布式锁 |

```java
// Caffeine 本地缓存（性能之王）
Cache<String, Object> cache = Caffeine.newBuilder()
    .maximumSize(10_000)           // 最多 10000 个条目
    .expireAfterWrite(Duration.ofMinutes(5))  // 写入后 5 分钟过期
    .recordStats()                 // 开启统计
    .build();

Object value = cache.get("key", k -> loadFromDB(k));  // 缓存未命中时自动加载
```

### 6.1.2 Redis Java 客户端对比

| 维度 | Jedis | Lettuce | Redisson |
|------|-------|---------|----------|
| 连接模型 | 阻塞 IO，连接池 | Netty 异步 IO，连接复用 | Netty 异步 IO |
| 线程安全 | 非线程安全（需连接池） | 线程安全 | 线程安全 |
| API 风格 | 命令式 | 同步/异步/响应式 | 对象式（分布式对象） |
| 功能丰富度 | 基础 Redis 命令 | 基础 Redis 命令 | 分布式锁、集合、队列等高级功能 |
| 性能 | 中 | 高 | 中高 |
| 适用场景 | 简单场景、遗留系统 | 高性能、响应式 | 需要分布式数据结构 |

```java
// Jedis：阻塞 IO，需连接池，非线程安全
try (Jedis jedis = jedisPool.getResource()) {
    jedis.get("key");
}

// Lettuce：Netty 异步 IO，线程安全，Spring Boot 默认
stringRedisTemplate.opsForValue().get("key");

// Redisson：对象式 API，内置分布式锁、集合等高级功能
RLock lock = redisson.getLock("myLock");
lock.lock();
try { /* 业务逻辑 */ } finally { lock.unlock(); }
```

### 6.1.3 Spring Cache 统一抽象

Spring Cache 提供了统一的缓存注解，底层可以切换不同的缓存实现：

```java
@SpringBootApplication
@EnableCaching
public class Application { }

@Service
public class ProductService {

    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        return productMapper.selectById(id);  // 缓存未命中时才执行
    }

    @CachePut(value = "products", key = "#product.id")
    public Product updateProduct(Product product) {
        productMapper.updateById(product);
        return product;
    }

    @CacheEvict(value = "products", key = "#id")
    public void deleteProduct(Long id) {
        productMapper.deleteById(id);
    }
}
```

```yaml
# application.yml - 切换为 Redis 作为缓存实现
spring:
  cache:
    type: redis
  redis:
    host: redis-host
    port: 6379
```

---

## 6.2 缓存一致性策略

### 6.2.1 Cache Aside（旁路缓存）

最常用的策略，应用代码同时维护缓存和数据库：

```java
public Product getProduct(Long id) {
    // 1. 先读缓存
    Product cached = redis.get("product:" + id);
    if (cached != null) return cached;

    // 2. 缓存未命中，读数据库
    Product product = productMapper.selectById(id);
    if (product != null) {
        redis.set("product:" + id, product, 30, TimeUnit.MINUTES);
    }
    return product;
}

public void updateProduct(Product product) {
    productMapper.updateById(product);         // 1. 先更新数据库
    redis.delete("product:" + product.getId()); // 2. 再删除缓存（不是更新！）
}
```

**为什么是"删除缓存"而不是"更新缓存"？** 并发写入时，更新缓存的顺序可能与数据库写入顺序不一致，导致缓存中存储了旧值。删除缓存让下次读取时重新加载，更安全。

### 6.2.2 Read-Through / Write-Through

缓存层代理数据库读写，应用只和缓存交互。写入时同步更新缓存和数据库（Write-Through），读取时缓存自动从数据库加载（Read-Through）。

### 6.2.3 延迟双删

在并发场景下，先删缓存再更新数据库可能导致短暂不一致。延迟双删通过二次删除来缓解：

```java
public void updateWithDelayDoubleDelete(Long id, Product newProduct) {
    redis.delete("product:" + id);            // 1. 先删缓存
    productMapper.updateById(newProduct);      // 2. 更新数据库
    // 3. 延迟再删一次，清掉并发读请求回填的旧数据
    CompletableFuture.delayedExecutor(500, TimeUnit.MILLISECONDS)
        .execute(() -> redis.delete("product:" + id));
}
```

### 6.2.4 缓存策略对比

| 策略 | 读路径 | 写路径 | 一致性 | 复杂度 | 适用场景 |
|------|-------|-------|-------|-------|---------|
| **Cache Aside** | 缓存→DB | 先写DB→删缓存 | 最终一致 | 低 | 通用，最常用 |
| **Read/Write Through** | 缓存自动加载 | 同步写缓存+DB | 较强 | 中 | 需要缓存透明代理 |
| **Write Behind** | 缓存读取 | 只写缓存，异步写DB | 弱 | 高 | 写密集型、可容忍丢失 |
| **延迟双删** | 缓存→DB | 删缓存→写DB→再删 | 较强 | 中 | 高并发写场景 |

---

## 6.3 三大经典问题

### 6.3.1 缓存穿透

**问题**：查询的数据在缓存和数据库中都不存在，每次请求都打到数据库。

**方案一：缓存空值**

```java
public Product getProduct(Long id) {
    String cached = redis.get("product:" + id);
    if (cached != null) {
        if ("NULL".equals(cached)) return null;  // 空值标记
        return JSON.parseObject(cached, Product.class);
    }
    Product product = productMapper.selectById(id);
    if (product == null) {
        redis.set("product:" + id, "NULL", 5, TimeUnit.MINUTES);  // 缓存空值
    } else {
        redis.set("product:" + id, JSON.toJSONString(product), 30, TimeUnit.MINUTES);
    }
    return product;
}
```

**方案二：布隆过滤器**

```java
@Component
public class BloomFilterProductGuard {

    private RBloomFilter<Long> bloomFilter;

    @PostConstruct
    public void init() {
        // 预计 100 万个商品，误判率 0.01%
        bloomFilter = redisson.getBloomFilter("productBloom");
        bloomFilter.tryInit(1_000_000L, 0.0001);
        productMapper.selectAllIds().forEach(id -> bloomFilter.add(id));
    }

    public Product getProduct(Long id) {
        if (!bloomFilter.contains(id)) return null;  // 一定不存在
        return productCache.get(id);  // 可能存在，继续查
    }
}
```

### 6.3.2 缓存击穿

**问题**：某个热点 Key 过期的瞬间，大量并发请求同时打到数据库。

**方案一：互斥锁**

```java
public Product getProductWithMutex(Long id) {
    String cached = redis.get("product:" + id);
    if (cached != null) return JSON.parseObject(cached, Product.class);

    String lockKey = "lock:product:" + id;
    if (redis.setIfAbsent(lockKey, "1", 10, TimeUnit.SECONDS)) {
        try {
            cached = redis.get("product:" + id);  // double-check
            if (cached != null) return JSON.parseObject(cached, Product.class);
            Product product = productMapper.selectById(id);
            redis.set("product:" + id, JSON.toJSONString(product), 30, TimeUnit.MINUTES);
            return product;
        } finally {
            redis.delete(lockKey);
        }
    }
    Thread.sleep(50);
    return getProductWithMutex(id);  // 未获锁，短暂等待后重试
}
```

**方案二：逻辑过期**

缓存永不过期，数据中携带逻辑过期时间。逻辑过期后不阻塞当前请求，而是异步刷新，先返回旧数据保证可用性。

### 6.3.3 缓存雪崩

**问题**：大量 Key 同时过期，或者 Redis 整体宕机，请求全部打到数据库。

**方案一：随机过期时间**

```java
// 基础过期时间 + 随机偏移，避免同时过期
long randomOffset = ThreadLocalRandom.current().nextLong(0, 10);
long totalExpire = baseExpireMinutes + randomOffset;
redis.set(key, JSON.toJSONString(value), totalExpire, TimeUnit.MINUTES);
```

**方案二：多级缓存**

```text
请求 → L1 本地缓存（Caffeine）→ L2 分布式缓存（Redis）→ 数据库
         │ 命中直接返回          │ 命中直接返回
```

即使 Redis 宕机，L1 本地缓存仍然能拦截大部分请求：

```java
@Component
public class MultiLevelCache {

    private final Cache<Long, Product> localCache = Caffeine.newBuilder()
        .maximumSize(5_000)
        .expireAfterWrite(Duration.ofMinutes(2))
        .build();

    public Product getProduct(Long id) {
        Product cached = localCache.getIfPresent(id);  // 1. 查 L1
        if (cached != null) return cached;

        String json = redis.opsForValue().get("product:" + id);  // 2. 查 L2
        if (json != null) {
            Product product = JSON.parseObject(json, Product.class);
            localCache.put(id, product);
            return product;
        }

        Product product = productMapper.selectById(id);  // 3. 查 DB
        if (product != null) {
            long expire = 30 + ThreadLocalRandom.current().nextLong(10);
            redis.opsForValue().set("product:" + id, JSON.toJSONString(product),
                                     expire, TimeUnit.MINUTES);
            localCache.put(id, product);
        }
        return product;
    }
}
```

### 6.3.4 三大问题对比总结

| 问题 | 触发条件 | 影响 | 解决方案 |
|------|---------|------|---------|
| **穿透** | 查询不存在的数据 | DB 被无效请求压垮 | 缓存空值 / 布隆过滤器 |
| **击穿** | 热点 Key 过期 | DB 瞬间高并发 | 互斥锁 / 逻辑过期 |
| **雪崩** | 大量 Key 同时过期 / Redis 宕机 | DB 全面过载 | 随机过期 / 多级缓存 / 限流 |

---

## 6.4 分库分表设计

### 6.4.1 什么时候需要分库分表

| 指标 | 阈值 | 说明 |
|------|------|------|
| 单表行数 | > 2000 万行 | B+ 树深度增加，查询变慢 |
| 单库数据量 | > 500 GB | 备份恢复时间过长 |
| 单库 QPS | > 5000 | 连接数、IO 成为瓶颈 |
| 写入 TPS | > 2000/s | 锁竞争严重 |

垂直拆分按业务拆库（订单库、用户库），解决不同业务的资源竞争；水平拆分按规则拆表（orders_0 ~ orders_3），解决单表数据量过大的问题。

### 6.4.2 分片键选择

分片键（Sharding Key）决定了数据如何分布，是分库分表设计中最关键的决策：

| 分片键选择 | 优点 | 缺点 | 适用场景 |
|-----------|------|------|---------|
| 用户 ID | 同一用户数据在同一分片 | 大卖家/大V 成为热点 | 电商订单、社交动态 |
| 订单 ID | 数据均匀分布 | 跨用户查询需要广播 | 通用订单系统 |
| 时间 | 按时间范围查询高效 | 写入热点在最新分片 | 日志、监控数据 |

### 6.4.3 路由方式

| 路由方式 | 原理 | 查询效率 | 适用 SQL |
|---------|------|---------|---------|
| 精确路由 | 根据分片键直接定位 | 最高（O(1)） | `WHERE user_id = ?` |
| 范围路由 | 按范围定位部分分片 | 高 | `WHERE create_time BETWEEN ? AND ?` |
| 广播路由 | 遍历所有分片 | 最低（O(n)） | `WHERE status = 'PAID'`（无分片键） |

### 6.4.4 ShardingSphere 配置示例

```yaml
spring:
  shardingsphere:
    datasource:
      names: ds0,ds1
      ds0:
        url: jdbc:mysql://host1:3306/order_db_0
      ds1:
        url: jdbc:mysql://host2:3306/order_db_1
    rules:
      sharding:
        tables:
          orders:
            actual-data-nodes: ds$->{0..1}.orders_$->{0..3}
            table-strategy:
              standard:
                sharding-column: user_id
                sharding-algorithm-name: order-mod
        sharding-algorithms:
          order-mod:
            type: MOD
            props:
              sharding-count: 4
```

### 6.4.5 扩容策略

| 策略 | 停机时间 | 数据迁移 | 复杂度 | 推荐场景 |
|------|---------|---------|-------|---------|
| 停机迁移 | 数小时 | 全量迁移 | 低 | 初创期、可接受停机 |
| 双写 | 无 | 新旧库同时写 | 中 | 中小规模 |
| 影子表 | 无 | 增量同步 + 切换 | 高 | 大规模、不停机 |

双写扩容流程：阶段1 双写（旧库为主）→ 阶段2 数据校验 → 阶段3 切换（新库为主）→ 阶段4 下线旧库。

---

## 6.5 数据冷热分离

### 6.5.1 冷热数据的定义

```text
┌─────────────────────────────────────────────┐
│  热数据（Hot）  ~10%   最近 1~7 天           │
│  存储：Redis / SSD    要求：毫秒级响应       │
├─────────────────────────────────────────────┤
│  温数据（Warm） ~30%   最近 1~6 个月         │
│  存储：MySQL SSD      要求：秒级响应         │
├─────────────────────────────────────────────┤
│  冷数据（Cold） ~60%   6 个月以前            │
│  存储：对象存储/HDD   要求：分钟级可接受     │
└─────────────────────────────────────────────┘
```

### 6.5.2 实现方案

```java
// 应用层路由：根据数据时间选择查询热库或冷库
public Order getOrder(Long orderId) {
    Order cached = (Order) redis.opsForValue().get("order:" + orderId);
    if (cached != null) return cached;

    Order order = hotOrderMapper.selectById(orderId);
    if (order == null) {
        order = coldOrderMapper.selectById(orderId);  // 热库没有再查冷库
    }
    return order;
}
```

数据库分区也是一种方案，MySQL 按时间范围分区后，归档时 `ALTER TABLE orders DROP PARTITION p2023` 秒级完成，不锁表。定时归档任务则在凌晨低峰期分批将老数据从热库迁移到冷库。

---

## 6.6 多数据源一致性

### 6.6.1 问题背景

数据往往需要同时存在于多个存储中（MySQL + ES + Redis + 数据仓库），如何保证它们之间的数据一致？

### 6.6.2 方案一：同步双写

```java
@Transactional
public void createProduct(Product product) {
    productMapper.insert(product);            // 写 MySQL
    elasticsearchTemplate.save(product);      // 写 ES
    redis.opsForValue().set("product:" + product.getId(), product); // 写 Redis
}
```

优点是实现简单、实时性强；缺点是任意一个失败都会影响主流程，性能差且强耦合。

### 6.6.3 方案二：Canal 异步同步

通过监听 MySQL binlog，异步同步到其他数据源：

```text
应用 → MySQL(写入) → binlog → Canal Server → MQ → ES/HBase/...
```

```java
// Canal 消费者：监听 binlog 变更，同步到 ES
@RabbitListener(queues = "canal.product")
public void onCanalMessage(CanalMessage message) {
    if ("product".equals(message.getTable())) {
        switch (message.getType()) {
            case INSERT, UPDATE -> esTemplate.save(convertToProduct(message.getRowData()));
            case DELETE -> esTemplate.delete(message.getRowData().get("id"));
        }
    }
}
```

优点是业务代码无侵入、新增数据源只需加消费者；缺点是有秒级延迟、Canal 本身需要高可用。

### 6.6.4 方案三：最终一致 + 对账

在异步同步的基础上，增加定时对账机制作为兜底：

```java
@Scheduled(cron = "0 0 3 * * ?")  // 每天凌晨 3 点对账
public void reconcile() {
    List<Long> mismatchIds = new ArrayList<>();
    // 分页对比 MySQL 和 ES 数据，找出不一致的记录
    int page = 0;
    while (true) {
        List<Product> dbProducts = productMapper.selectPage(page++, 1000);
        if (dbProducts.isEmpty()) break;
        for (Product p : dbProducts) {
            Product esP = esTemplate.get(p.getId());
            if (esP == null || !esP.equals(p)) mismatchIds.add(p.getId());
        }
    }
    // 修复不一致数据
    mismatchIds.forEach(id -> esTemplate.save(productMapper.selectById(id)));
}
```

### 6.6.5 方案对比

| 维度 | 同步双写 | Canal 异步同步 | 最终一致+对账 |
|------|---------|--------------|-------------|
| **实时性** | 实时 | 秒级延迟 | 分钟/小时级修复 |
| **业务侵入** | 高（需改写入逻辑） | 低（监听 binlog） | 低（独立任务） |
| **可靠性** | 中（任一失败影响主流程） | 高（binlog 不丢） | 高（对账兜底） |
| **性能影响** | 大（串行多写） | 小（异步） | 无（后台任务） |
| **推荐指数** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

> **最佳实践**：Canal 异步同步 + 定时对账的组合是业界主流方案。Canal 保证实时性，对账保证最终一致性，两者互补。

### 6.6.6 读写分离的主从延迟问题

读写分离看起来完美：写走主库，读走从库，各司其职。但你有没有想过：用户刚下了单，立刻查订单列表——写请求走主库成功了，读请求却打到了从库，从库还没同步过来。用户看到的是“订单不存在”。这不是理论推演，是每天都在发生的生产 Bug。

用户下单后立即查询订单，写请求走主库，读请求走从库。如果主从之间有 100ms~1s 的延迟，用户会看到"订单不存在"。这是一个真实且常见的生产问题。

**三种应对策略**：

**策略一：关键读走主库**

用 `@Master` 注解标记需要读主库的方法：

```java
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface Master {}

// 写操作后紧跟的读操作，强制走主库
@Master
public Order getOrderAfterCreate(Long orderId) {
    return orderRepository.findById(orderId);  // 走主库
}
```

**策略二：写后短暂强制读主库（ThreadLocal 标记）**

```java
// 在切面中，写操作完成后设置 ThreadLocal 标记
@After("@annotation(Transactional)")
public void afterWrite() {
    ReadWriteContext.forceMaster(Duration.ofSeconds(2));  // 2 秒内读主库
}

// 数据源路由时检查标记
@Override
protected Object determineCurrentLookupKey() {
    if (ReadWriteContext.isForceMaster()) return "master";
    return ReadWriteContext.isRead() ? "slave" : "master";
}
```

**策略三：接受延迟（非关键场景）**

对于个人中心、商品列表等非关键场景，1 秒的延迟可以接受。不需要特殊处理，用户刷新一下就能看到最新数据。

**选择建议**：支付结果、订单状态等关键场景用策略一；写后立即读的场景用策略二；非关键场景用策略三。不要所有读都走主库——那就失去了读写分离的意义。

---

> **本章小结**：数据架构的核心挑战是"性能"与"一致性"的博弈。缓存提升性能但引入一致性问题，分库分表提升容量但引入复杂度，冷热分离优化成本但引入路由逻辑。没有完美的方案，只有适合业务场景的选择。

---

> 缓存和分库分表解决了存储层的扩展，但有些场景不适合同步处理：下单后发短信、记日志、通知仓库。同步调用四个服务，任何一个超时就卡住。下一章讲消息驱动架构：怎么用异步消息把同步链路拆开。
