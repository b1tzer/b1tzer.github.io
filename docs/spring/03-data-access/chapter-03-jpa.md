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

---
*待补充：更多 JPA 高级用法*
