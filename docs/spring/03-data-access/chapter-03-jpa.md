# Spring Data JPA

## 1. 实体定义

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 50)
    private String name;
}
```

## 2. Repository 接口

```java
public interface UserRepository extends JpaRepository<User, Long> {
    List<User> findByName(String name);
    
    @Query("SELECT u FROM User u WHERE u.email LIKE %:email%")
    List<User> findByEmailLike(@Param("email") String email);
    
    @Modifying
    @Query("UPDATE User u SET u.status = :status WHERE u.id = :id")
    int updateStatus(@Param("id") Long id, @Param("status") Integer status);
}
```

## 3. Specification 动态查询

```java
public class UserSpecs {
    public static Specification<User> nameLike(String name) {
        return (root, query, cb) -> cb.like(root.get("name"), "%" + name + "%");
    }
    
    public static Specification<User> statusEquals(Integer status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }
}

// 使用
List<User> users = userRepository.findAll(
    Specification.where(nameLike("张")).and(statusEquals(1))
);
```

## 4. JPA 高级用法

### 4.1 审计功能

```java
// 审计基类
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @CreatedBy
    @Column(updatable = false)
    private String createdBy;

    @LastModifiedBy
    private String updatedBy;
}

// 启用审计
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorProvider")
public class JpaConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> Optional.ofNullable(
            SecurityContextHolder.getContext().getAuthentication())
            .map(auth -> auth.getName())
            .or(() -> Optional.of("system"));
    }
}

// 使用
@Entity
public class Order extends BaseEntity {
    @Column(nullable = false)
    private String orderNo;
    private BigDecimal totalAmount;
    // createdAt, updatedAt, createdBy, updatedBy 自动填充
}
```

### 4.2 复杂查询（Criteria API）

```java
@Repository
public class UserRepositoryImpl {

    @PersistenceContext
    private EntityManager em;

    public List<User> searchUsers(UserSearchRequest request) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<User> query = cb.createQuery(User.class);
        Root<User> root = query.from(User.class);

        List<Predicate> predicates = new ArrayList<>();

        if (StringUtils.isNotBlank(request.getKeyword())) {
            predicates.add(cb.or(
                cb.like(root.get("name"), "%" + request.getKeyword() + "%"),
                cb.like(root.get("email"), "%" + request.getKeyword() + "%")
            ));
        }
        if (request.getStatus() != null) {
            predicates.add(cb.equal(root.get("status"), request.getStatus()));
        }
        if (request.getMinAge() != null) {
            predicates.add(cb.greaterThanOrEqualTo(root.get("age"), request.getMinAge()));
        }

        query.where(predicates.toArray(new Predicate[0]));
        query.orderBy(cb.desc(root.get("createdAt")));

        return em.createQuery(query).getResultList();
    }
}
```

### 4.3 原生 SQL 查询

```java
public interface UserRepository extends JpaRepository<User, Long> {

    // 原生 SQL
    @Query(value = "SELECT u.*, o.order_count " +
                   "FROM users u LEFT JOIN " +
                   "(SELECT user_id, COUNT(*) as order_count FROM orders GROUP BY user_id) o " +
                   "ON u.id = o.user_id WHERE u.status = :status", nativeQuery = true)
    List<UserWithOrderCount> findUsersWithOrderCount(@Param("status") String status);

    // DTO 投影
    @Query("SELECT new com.example.dto.UserSummary(u.id, u.name, u.email) " +
           "FROM User u WHERE u.status = 'ACTIVE'")
    List<UserSummary> findActiveUserSummaries();

    // 分页查询
    @Query("SELECT u FROM User u WHERE u.name LIKE %:keyword%")
    Page<User> searchByName(@Param("keyword") String keyword, Pageable pageable);

    // 批量更新
    @Modifying
    @Query("UPDATE User u SET u.status = :status WHERE u.id IN :ids")
    int batchUpdateStatus(@Param("ids") List<Long> ids, @Param("status") String status);
}
```

### 4.4 JPA 性能优化

```java
@Entity
public class Order extends BaseEntity {

    // N+1 问题解决方案一：JOIN FETCH
    @ManyToOne(fetch = FetchType.LAZY)  // 推荐 LAZY
    @JoinColumn(name = "user_id")
    private User user;

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    private List<OrderItem> items;
}

public interface OrderRepository extends JpaRepository<Order, Long> {

    // JOIN FETCH 一次性加载关联对象
    @Query("SELECT o FROM Order o JOIN FETCH o.user JOIN FETCH o.items WHERE o.id = :id")
    Optional<Order> findByIdWithDetails(@Param("id") Long id);

    // EntityGraph 指定加载策略
    @EntityGraph(attributePaths = {"user", "items"})
    @Query("SELECT o FROM Order o WHERE o.status = :status")
    List<Order> findByStatusWithDetails(@Param("status") String status);
}
```

**最佳实践：**

1. **关联关系用 `FetchType.LAZY`**——避免 N+1 查询问题
2. **需要时用 `JOIN FETCH` 或 `@EntityGraph`** 一次性加载
3. **审计字段用 `@CreatedDate` / `@LastModifiedDate`**——无需手动维护
4. **批量操作用 `@Modifying` + `@Query`**——避免逐条查询再更新
5. **DTO 投影**优于实体查询——只查需要的字段，减少内存占用
