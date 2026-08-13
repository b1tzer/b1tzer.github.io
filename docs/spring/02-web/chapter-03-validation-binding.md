# 参数校验与数据绑定

## 1. Bean Validation

```java
public class UserDTO {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 20, message = "用户名长度2-20")
    private String username;
    
    @Email(message = "邮箱格式不正确")
    private String email;
    
    @Range(min = 1, max = 150, message = "年龄1-150")
    private Integer age;
}
```

## 2. 自定义校验注解

```java
@Target({FIELD, PARAMETER})
@Retention(RUNTIME)
@Constraint(validatedBy = PhoneValidator.class)
public @interface Phone {
    String message() default "手机号格式不正确";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

## 3. 数据绑定原理

DataBinder → PropertyEditor → TypeConverter → ConversionService

## 4. 校验实战

### 4.1 分组校验

```java
public class ValidationGroups {
    public interface Create {}
    public interface Update {}
}

public class UserDTO {
    @NotBlank(groups = {Create.class, Update.class})
    @Size(min = 2, max = 20, groups = {Create.class, Update.class})
    private String username;

    @NotBlank(groups = Create.class)  // 创建时必填，更新时可选
    @Email(groups = {Create.class, Update.class})
    private String email;

    @NotNull(groups = Update.class)  // 更新时必须有 ID
    private Long id;
}

@RestController
@RequestMapping("/api/users")
public class UserController {

    @PostMapping
    public User createUser(@Validated(ValidationGroups.Create.class) @RequestBody UserDTO dto) {
        return userService.create(dto);
    }

    @PutMapping("/{id}")
    public User updateUser(@Validated(ValidationGroups.Update.class) @RequestBody UserDTO dto) {
        return userService.update(dto);
    }
}
```

### 4.2 嵌套对象校验

```java
public class OrderDTO {
    @NotNull
    private Long userId;

    @NotEmpty(message = "订单商品不能为空")
    @Valid  // 嵌套对象需要 @Valid 触发校验
    private List<OrderItemDTO> items;

    @Valid
    @NotNull
    private AddressDTO shippingAddress;  // 嵌套对象
}

public class OrderItemDTO {
    @NotNull
    private Long productId;

    @Min(value = 1, message = "数量至少为1")
    @Max(value = 999, message = "数量最多999")
    private Integer quantity;
}
```

### 4.3 自定义校验注解（枚举值校验）

```java
@Target({FIELD, PARAMETER})
@Retention(RUNTIME)
@Constraint(validatedBy = EnumValueValidator.class)
public @interface EnumValue {
    Class<? extends Enum<?>> enumClass();
    String message() default "值不在允许范围内";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class EnumValueValidator implements ConstraintValidator<EnumValue, String> {

    private Set<String> allowedValues;

    @Override
    public void initialize(EnumValue annotation) {
        allowedValues = Arrays.stream(annotation.enumClass().getEnumConstants())
            .map(Enum::name)
            .collect(Collectors.toSet());
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value == null || allowedValues.contains(value);
    }
}

// 使用
public class UserDTO {
    @EnumValue(enumClass = UserStatus.class, message = "无效的用户状态")
    private String status;
}
```

### 4.4 方法级校验

```java
@Service
@Validated  // 启用方法参数校验
public class UserService {

    public User getUser(@Min(1) Long id) {
        return userRepository.findById(id).orElseThrow();
    }

    public List<User> searchUsers(
            @NotBlank @Size(min = 2, max = 50) String keyword,
            @Min(1) @Max(100) int limit) {
        return userRepository.search(keyword, limit);
    }
}
```

### 4.5 数据绑定原理

Spring MVC 的数据绑定流程：

```text
HTTP 请求参数（String 类型）
    │
    ▼
PropertyEditor（JavaBeans 标准，String → 目标类型）
    │
    ▼
ConversionService（Spring 类型转换体系，支持泛型）
    │
    ▼
DataBinder（数据绑定 + 校验）
    │
    ▼
绑定结果（BindingResult）
    │
    ├── 校验通过 → 调用 Controller 方法
    └── 校验失败 → 抛出 MethodArgumentNotValidException
```

**最佳实践：**

1. **分组校验**区分创建和更新场景，避免更新时强制要求所有字段
2. **嵌套对象**必须加 `@Valid`，否则不会触发内部校验
3. **自定义校验注解**封装通用校验逻辑，保持代码整洁
4. **方法级校验**适用于 Service 层，防止非 Web 入口绕过校验
5. **统一异常处理**捕获校验异常，返回前端友好的错误信息
