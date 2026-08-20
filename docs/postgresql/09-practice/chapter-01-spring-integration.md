# Spring Boot 集成

## 1. 配置

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: postgres
    password: secret
    driver-class-name: org.postgresql.Driver
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
```

## 2. JPA 适配

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;
}
```

## 3. MyBatis 适配

```xml
<insert id="insert" useGeneratedKeys="true" keyProperty="id">
    INSERT INTO users (name, email) VALUES (#{name}, #{email})
    RETURNING id
</insert>
```
## 4. 更多 Spring 集成场景

### 4.1 JPA + JSONB 详解

```java
// 自定义 JSONB 类型处理器
@TypeDef(name = "jsonb", typeClass = JsonBinaryType.class)
@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> attributes;

    @Type(JsonBinaryType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> tags;
}

// Repository 查询 JSONB
public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query(value = "SELECT * FROM products WHERE attributes @> :filter::jsonb", nativeQuery = true)
    List<Product> findByAttributes(@Param("filter") String filter);

    @Query(value = "SELECT * FROM products WHERE attributes ->> 'brand' = :brand", nativeQuery = true)
    List<Product> findByBrand(@Param("brand") String brand);
}
```

### 4.2 MyBatis + PostgreSQL 高级用法

```xml
<!-- 批量插入 -->
<insert id="batchInsert" parameterType="list">
    INSERT INTO users (name, email) VALUES
    <foreach collection="list" item="item" separator=",">
        (#{item.name}, #{item.email})
    </foreach>
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
</insert>

<!-- UPSERT -->
<insert id="upsert">
    INSERT INTO user_stats (user_id, login_count, last_login)
    VALUES (#{userId}, 1, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        login_count = user_stats.login_count + 1,
        last_login = NOW()
    RETURNING login_count
</insert>

<!-- JSONB 查询 -->
<select id="findByAttributes" resultType="Product">
    SELECT * FROM products
    WHERE attributes @> #{filter}::jsonb
</select>

<!-- 使用 ARRAY 类型 -->
<insert id="insertWithArray">
    INSERT INTO articles (title, tags)
    VALUES (#{title}, #{tags, typeHandler=ArrayTypeHandler})
</insert>
```

### 4.3 Spring Data JPA 审计

```java
// 自动填充审计字段
@Entity
@EntityListeners(AuditingEntityListener.class)
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;

    @CreatedBy
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;
}

// 启用审计
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
```

### 4.4 事务管理

```java
@Service
public class OrderService {

    @Transactional
    public void createOrder(Long userId, List<OrderItem> items) {
        // 所有操作在同一事务中
        Order order = new Order();
        order.setUserId(userId);
        orderRepository.save(order);

        for (OrderItem item : items) {
            item.setOrderId(order.getId());
            orderItemRepository.save(item);
        }
    }

    // 只读事务（优化器会优化查询计划）
    @Transactional(readOnly = true)
    public List<Order> getUserOrders(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    // 设置事务超时
    @Transactional(timeout = 30)
    public void batchProcess() {
        // 批量处理逻辑
    }

    // 使用 PG 的 advisory lock
    @Transactional
    public void processWithLock(Long lockId) {
        jdbcTemplate.execute("SELECT pg_advisory_xact_lock(" + lockId + ")");
        // 执行需要互斥的逻辑
    }
}
```

### 4.5 连接池配置

```yaml
# HikariCP 配置
spring:
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 600000
      max-lifetime: 1800000
      connection-timeout: 30000
      # PostgreSQL 特定优化
      data-source-properties:
        prepareThreshold: 3          # 预编译阈值
        preparedStatementCacheQueries: 256
        preparedStatementCacheSizeMiB: 5
        socketTimeout: 30
        connectTimeout: 10
```

### 4.6 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| JSONB 字段查询报错 | JPA 不支持原生 JSONB 类型 | 使用 `@Type(JsonBinaryType.class)` |
| 批量插入慢 | 逐条 INSERT | 使用 `COPY` 或批量 INSERT |
| 连接池耗尽 | 长事务或连接泄漏 | 检查事务范围，使用 `@Transactional` |
| UUID 主键性能差 | UUID 随机导致索引页分裂 | 使用 `uuid_generate_v7()`（时间有序） |
| 时区问题 | PG 的 TIMESTAMPTZ 与 Java 的 LocalDateTime | 统一使用 UTC，应用层转换时区 |
