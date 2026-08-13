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

---
*待补充：更多校验场景*
