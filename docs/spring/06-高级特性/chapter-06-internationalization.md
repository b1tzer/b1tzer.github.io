# 国际化 i18n

## 1. 配置

```yaml
spring:
  messages:
    basename: messages
    encoding: UTF-8
```

## 2. 资源文件

```properties
# messages_zh_CN.properties
user.name=用户名
user.email=邮箱

# messages_en_US.properties
user.name=Username
user.email=Email
```

## 3. 使用

```java
@RestController
public class UserController {
    @Autowired
    private MessageSource messageSource;
    
    @GetMapping("/greeting")
    public String greeting(Locale locale) {
        return messageSource.getMessage("user.name", null, locale);
    }
}
```

---
*待补充：更多国际化场景*
