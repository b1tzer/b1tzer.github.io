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

## 4. MyBatis 高级用法

### 4.1 动态 SQL

```xml
<!-- mapper/UserMapper.xml -->
<mapper namespace="com.example.mapper.UserMapper">

    <!-- if 条件判断 -->
    <select id="searchUsers" resultType="User">
        SELECT * FROM users
        <where>
            <if test="keyword != null and keyword != ''">
                AND (name LIKE CONCAT('%', #{keyword}, '%')
                  OR email LIKE CONCAT('%', #{keyword}, '%'))
            </if>
            <if test="status != null">
                AND status = #{status}
            </if>
            <if test="minAge != null">
                AND age >= #{minAge}
            </if>
            <if test="maxAge != null">
                AND age <= #{maxAge}
            </if>
        </where>
        ORDER BY created_at DESC
    </select>

    <!-- foreach 批量插入 -->
    <insert id="batchInsert">
        INSERT INTO users (name, email, status) VALUES
        <foreach collection="list" item="user" separator=",">
            (#{user.name}, #{user.email}, #{user.status})
        </foreach>
    </insert>

    <!-- choose/when/otherwise 多条件分支 -->
    <select id="findUsers" resultType="User">
        SELECT * FROM users
        <where>
            <choose>
                <when test="id != null">
                    AND id = #{id}
                </when>
                <when test="email != null">
                    AND email = #{email}
                </when>
                <otherwise>
                    AND status = 'ACTIVE'
                </otherwise>
            </choose>
        </where>
    </select>

</mapper>
```

### 4.2 结果映射（嵌套对象）

```xml
<!-- 一对多映射 -->
<resultMap id="orderWithItems" type="Order">
    <id property="id" column="order_id"/>
    <result property="orderNo" column="order_no"/>
    <result property="totalAmount" column="total_amount"/>
    <result property="createdAt" column="created_at"/>

    <!-- 关联用户 -->
    <association property="user" javaType="User">
        <id property="id" column="user_id"/>
        <result property="name" column="user_name"/>
    </association>

    <!-- 关联订单项 -->
    <collection property="items" ofType="OrderItem">
        <id property="id" column="item_id"/>
        <result property="productName" column="product_name"/>
        <result property="quantity" column="quantity"/>
        <result property="price" column="price"/>
    </collection>
</resultMap>

<select id="findOrderWithItems" resultMap="orderWithItems">
    SELECT o.id AS order_id, o.order_no, o.total_amount, o.created_at,
           u.id AS user_id, u.name AS user_name,
           oi.id AS item_id, oi.product_name, oi.quantity, oi.price
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = #{orderId}
</select>
```

### 4.3 MyBatis-Plus 高级查询

```java
public interface UserMapper extends BaseMapper<User> {

    // 自定义 SQL
    @Select("SELECT u.*, o.order_count FROM users u " +
            "LEFT JOIN (SELECT user_id, COUNT(*) as order_count " +
            "FROM orders GROUP BY user_id) o ON u.id = o.user_id " +
            "WHERE u.id = #{id}")
    UserWithOrderCount selectWithOrderCount(@Param("id") Long id);
}

// Service 层使用 LambdaQueryWrapper
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    public IPage<User> searchUsers(UserSearchRequest request) {
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<User>()
            .like(StringUtils.isNotBlank(request.getKeyword()),
                  User::getName, request.getKeyword())
            .eq(request.getStatus() != null, User::getStatus, request.getStatus())
            .between(request.getMinAge() != null && request.getMaxAge() != null,
                     User::getAge, request.getMinAge(), request.getMaxAge())
            .orderByDesc(User::getCreatedAt);

        return page(new Page<>(request.getPage(), request.getSize()), wrapper);
    }

    // 批量插入
    public void batchInsert(List<User> users) {
        saveBatch(users, 500);  // 每批 500 条
    }
}
```

### 4.4 MyBatis 拦截器（插件）

```java
@Component
@Intercepts({
    @Signature(type = Executor.class, method = "query",
        args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class})
})
public class SlowSqlInterceptor implements Interceptor {

    private static final Logger log = LoggerFactory.getLogger(SlowSqlInterceptor.class);
    private static final long SLOW_SQL_THRESHOLD = 1000; // 1 秒

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return invocation.proceed();
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            if (elapsed > SLOW_SQL_THRESHOLD) {
                MappedStatement ms = (MappedStatement) invocation.getArgs()[0];
                log.warn("慢 SQL [{}ms]: {}", elapsed, ms.getId());
            }
        }
    }

    @Override
    public Object plugin(Object target) {
        return Plugin.wrap(target, this);
    }
}
```

**最佳实践：**

1. **动态 SQL 用 XML**——复杂的条件查询放在 XML 中更清晰
2. **简单查询用注解**——`@Select`、`@Insert` 适合简单 CRUD
3. **批量操作注意分批**——MySQL 的 `max_allowed_packet` 限制单条 SQL 大小
4. **慢 SQL 监控**——拦截器记录超过阈值的 SQL，及时优化
