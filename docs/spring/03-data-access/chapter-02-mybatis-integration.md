# MyBatis 集成

## 1. 配置

```yaml
mybatis:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.example.entity
  configuration:
    map-underscore-to-camel-case: true
```

## 2. Mapper 接口

```java
@Mapper
public interface UserMapper {
    @Select("SELECT * FROM user WHERE id = #{id}")
    User findById(Long id);
    
    @Insert("INSERT INTO user(name, email) VALUES(#{name}, #{email})")
    @Options(useGeneratedKeys = true)
    int insert(User user);
}
```

## 3. MyBatis-Plus

```java
public interface UserMapper extends BaseMapper<User> {
    // 自动拥有 CRUD 方法
}

// 使用
List<User> users = userMapper.selectList(
    new QueryWrapper<User>().eq("status", 1)
);
```

---
*待补充：更多 MyBatis 高级用法*
