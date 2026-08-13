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

---
*待补充：更多授权场景*
