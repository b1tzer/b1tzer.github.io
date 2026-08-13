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

## 4. 国际化高级用法

### 4.1 运行时切换语言

```java
@Configuration
public class I18nConfig implements WebMvcConfigurer {

    // 方式一：通过请求参数切换 ?lang=en_US
    @Bean
    public LocaleResolver localeResolver() {
        AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
        resolver.setDefaultLocale(Locale.CHINA);
        return resolver;
    }

    // 方式二：通过请求头 Accept-Language 切换
    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");  // ?lang=en_US
        return interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor());
    }
}
```

### 4.2 国际化异常消息

```java
@RestControllerAdvice
public class I18nExceptionHandler {

    @Autowired
    private MessageSource messageSource;

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException ex, Locale locale) {
        // 根据当前语言获取错误消息
        String message = messageSource.getMessage(
            ex.getMessageCode(),       // 消息 key
            ex.getArgs(),              // 参数
            locale                     // 当前语言
        );

        ErrorResponse error = new ErrorResponse(ex.getCode(), message);
        return ResponseEntity.status(ex.getHttpStatus()).body(error);
    }
}
```

### 4.3 数据库驱动的国际化

```java
@Service
public class DatabaseMessageSource extends AbstractMessageSource {

    @Autowired
    private MessageRepository messageRepository;

    @Override
    protected MessageFormat resolveCode(String code, Locale locale) {
        // 从数据库查询消息
        String message = messageRepository
            .findByCodeAndLocale(code, locale.toString())
            .map(MessageEntity::getContent)
            .orElseGet(() -> getDefaultMessage(code, locale));

        return createMessageFormat(message, locale);
    }

    private String getDefaultMessage(String code, Locale locale) {
        // 回退到 properties 文件
        try {
            ResourceBundle bundle = ResourceBundle.getBundle("messages", locale);
            return bundle.getString(code);
        } catch (MissingResourceException e) {
            return code;  // 找不到就返回 code 本身
        }
    }
}
```

### 4.4 国际化工具类

```java
@Component
public class I18nUtil {

    private static MessageSource messageSource;

    @Autowired
    public void setMessageSource(MessageSource messageSource) {
        I18nUtil.messageSource = messageSource;
    }

    /**
     * 获取国际化消息
     * @param code 消息 key
     * @param args 参数
     * @return 当前语言的消息
     */
    public static String get(String code, Object... args) {
        Locale locale = LocaleContextHolder.getLocale();
        return messageSource.getMessage(code, args, locale);
    }

    /**
     * 获取指定语言的消息
     */
    public static String get(String code, Locale locale, Object... args) {
        return messageSource.getMessage(code, args, locale);
    }
}

// 使用
@GetMapping("/greeting")
public Map<String, String> greeting() {
    return Map.of(
        "welcome", I18nUtil.get("msg.welcome"),
        "username", I18nUtil.get("msg.username"),
        "email", I18nUtil.get("msg.email")
    );
}
```

**最佳实践：**

1. **消息 key 命名规范**——`模块.功能.类型`，如 `user.login.error.password`
2. **默认语言兜底**——`messages.properties` 作为默认语言文件，避免 key 找不到
3. **参数化消息**——用 `{0}` 占位符，如 `msg.user.welcome=欢迎, {0}!`
4. **前端国际化**——API 返回 key，前端用 i18n 库翻译，减少后端压力
5. **Locale 持久化**——记住用户语言偏好，存入 Cookie 或用户设置
