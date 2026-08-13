# 授权模型

## 1. RBAC 模型

```java
@Configuration
@EnableMethodSecurity
public class MethodSecurityConfig {
    // 启用方法级安全
}

@Service
public class AdminService {
    @PreAuthorize("hasRole('ADMIN')")
    public void adminOperation() { /* ... */ }
    
    @PreAuthorize("hasAuthority('user:write')")
    public void writeUser() { /* ... */ }
    
    @PostAuthorize("returnObject.username == authentication.name")
    public User getUser(Long id) { /* ... */ }
}
```

## 2. 自定义权限评估

```java
@Component
public class CustomPermissionEvaluator implements PermissionEvaluator {
    @Override
    public boolean hasPermission(Authentication auth, Object target, Object permission) {
        // 自定义权限逻辑
        return true;
    }
}
```

## 3. 授权实战

### 3.1 数据权限控制

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DataScope {
    String tableAlias() default "";  // 表别名
    String deptColumn() default "dept_id";
    String userColumn() default "create_by";
}

@Aspect
@Component
public class DataScopeAspect {

    @Before("@annotation(dataScope)")
    public void before(JoinPoint point, DataScope dataScope) {
        // 获取当前用户角色和部门信息
        LoginUser currentUser = SecurityUtils.getCurrentUser();
        List<String> roles = currentUser.getRoles();

        StringBuilder sqlFilter = new StringBuilder();

        // 超级管理员不过滤
        if (!roles.contains("ROLE_ADMIN")) {
            // 部门管理员：只看本部门数据
            if (roles.contains("ROLE_DEPT_ADMIN")) {
                sqlFilter.append(String.format(" AND %s.%s = %d",
                    dataScope.tableAlias(), dataScope.deptColumn(),
                    currentUser.getDeptId()));
            } else {
                // 普通用户：只看自己创建的数据
                sqlFilter.append(String.format(" AND %s.%s = '%s'",
                    dataScope.tableAlias(), dataScope.userColumn(),
                    currentUser.getUsername()));
            }
        }

        // 将过滤条件注入到 MyBatis 的 SQL 中
        MDC.put("dataScope", sqlFilter.toString());
    }
}

// 使用
@Service
public class OrderService {
    @DataScope(tableAlias = "o", deptColumn = "dept_id")
    public List<Order> listOrders() {
        return orderMapper.selectAll();  // SQL 中会自动追加数据权限条件
    }
}
```

### 3.2 数据库级权限控制

```java
@Service
public class DatabasePermissionService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // 根据用户角色动态修改查询 SQL
    public String buildPermissionFilter(String resource, LoginUser user) {
        List<String> permissions = user.getPermissions();
        if (permissions.contains("*:*:*")) {
            return "";  // 超级管理员，不过滤
        }

        String permission = findMatchingPermission(permissions, resource);
        if (permission == null) {
            throw new AccessDeniedException("无 " + resource + " 访问权限");
        }

        // 解析权限表达式
        if (permission.contains("dept:")) {
            return " AND dept_id IN (" + getDeptTree(user.getDeptId()) + ")";
        } else if (permission.contains("self:")) {
            return " AND create_by = '" + user.getUsername() + "'";
        }
        return "";
    }
}
```

### 3.3 权限缓存

```java
@Service
public class PermissionCacheService {

    private final Cache<String, Set<String>> permissionCache = CacheBuilder.newBuilder()
        .maximumSize(10000)
        .expireAfterWrite(5, TimeUnit.MINUTES)
        .build();

    public Set<String> getUserPermissions(Long userId) {
        return permissionCache.getUnchecked(String.valueOf(userId),
            () -> loadPermissionsFromDb(userId));
    }

    private Set<String> loadPermissionsFromDb(Long userId) {
        // 查询用户的角色和权限
        return permissionMapper.selectByUserId(userId).stream()
            .map(Permission::getCode)
            .collect(Collectors.toSet());
    }

    // 用户权限变更时清除缓存
    public void evictUser(Long userId) {
        permissionCache.invalidate(String.valueOf(userId));
    }
}
```

**最佳实践：**

1. **权限粒度**——菜单权限 + 按钮权限 + 数据权限，三层控制
2. **角色设计**——遵循最小权限原则，不要给用户多余权限
3. **权限缓存**——权限查询频繁，必须缓存，变更时主动清除
4. **`@PreAuthorize` 优于 `@Secured`**——前者支持 SpEL 表达式，更灵活
5. **接口和菜单权限分开管理**——接口权限防越权访问，菜单权限控制前端展示
