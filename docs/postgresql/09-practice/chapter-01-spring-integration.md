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

---
*待补充：更多 Spring 集成场景*
