# 依赖注入

## 1. DI 类型

### 构造器注入（推荐）
```java
@Service
public class UserService {
    private final UserRepository userRepository;
    
    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

### 字段注入
```java
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}
```

### Setter 注入
```java
@Service
public class UserService {
    private UserRepository userRepository;
    
    @Autowired
    public void setUserRepository(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

## 2. @Autowired 原理

AutowiredAnnotationBeanPostProcessor 处理 @Autowired 注解：
1. 按类型查找
2. 找到多个按名称匹配
3. 使用 @Qualifier 指定

## 3. @Resource vs @Autowired

| 特性 | @Autowired | @Resource |
|------|-----------|-----------|
| 来源 | Spring | JSR-250 |
| 匹配方式 | 按类型 | 按名称 |
| 必须存在 | required=false 可选 | 必须存在 |

---
*待补充：更多注入场景*
