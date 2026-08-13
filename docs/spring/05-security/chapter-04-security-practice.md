# 安全最佳实践

## 1. CSRF 防护

```java
@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()));
        return http.build();
    }
}
```

## 2. CORS 配置

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://example.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowCredentials(true);
    }
}
```

## 3. 安全头部

```java
http.headers(headers -> headers
    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
    .frameOptions(frame -> frame.deny())
    .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
);
```

## 4. 安全最佳实践清单

### 4.1 输入验证与 SQL 注入防护

```java
// MyBatis 参数化查询（安全）
@Select("SELECT * FROM users WHERE id = #{id}")
User findById(@Param("id") Long id);

// ❌ 危险：字符串拼接（SQL 注入）
@Select("SELECT * FROM users WHERE name = '" + "${name}" + "'")
User findByName(@Param("name") String name);
```

### 4.2 XSS 防护

```java
@Component
public class XssFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        chain.doFilter(new XssRequestWrapper(request), response);
    }
}

public class XssRequestWrapper extends HttpServletRequestWrapper {

    public XssRequestWrapper(HttpServletRequest request) {
        super(request);
    }

    @Override
    public String getParameter(String name) {
        String value = super.getParameter(name);
        return value != null ? cleanXSS(value) : null;
    }

    @Override
    public String[] getParameterValues(String name) {
        String[] values = super.getParameterValues(name);
        if (values == null) return null;
        return Arrays.stream(values).map(this::cleanXSS).toArray(String[]::new);
    }

    private String cleanXSS(String value) {
        return value
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&#39;")
            .replaceAll("javascript:", "")
            .replaceAll("on\\w+=", "");
    }
}
```

### 4.3 安全头部配置

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.headers(headers -> headers
        // 防止点击劫持
        .frameOptions(frame -> frame.deny())
        // XSS 防护
        .xssProtection(xss -> xss
            .headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
        // 内容安全策略
        .contentSecurityPolicy(csp -> csp
            .policyDirectives("default-src 'self'; " +
                "script-src 'self' 'unsafe-inline'; " +
                "style-src 'self' 'unsafe-inline'"))
        // HSTS（HTTPS 强制）
        .httpStrictTransportSecurity(hsts -> hsts
            .includeSubDomains(true)
            .maxAgeInSeconds(31536000))
        // 禁止浏览器嗅探 MIME 类型
        .contentTypeOptions(contentType -> {}));
    return http.build();
}
```

### 4.4 接口幂等性

```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Idempotent {
    long timeout() default 5;  // 幂等窗口 5 秒
    TimeUnit unit() default TimeUnit.SECONDS;
    String message() default "请勿重复提交";
}

@Aspect
@Component
public class IdempotentAspect {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Around("@annotation(idempotent)")
    public Object check(ProceedingJoinPoint pjp, Idempotent idempotent) throws Throwable {
        // 构建幂等 key：用户ID + 请求方法 + 参数哈希
        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        String method = pjp.getSignature().toShortString();
        String argsHash = Integer.toHexString(Arrays.deepHashCode(pjp.getArgs()));
        String key = "idempotent:" + userId + ":" + method + ":" + argsHash;

        // 尝试设置 key（原子操作）
        Boolean success = redisTemplate.opsForValue()
            .setIfAbsent(key, "1", idempotent.timeout(), idempotent.unit());

        if (!Boolean.TRUE.equals(success)) {
            throw new BusinessException(429, idempotent.message());
        }

        try {
            return pjp.proceed();
        } catch (Throwable t) {
            // 业务异常时删除幂等 key，允许重试
            redisTemplate.delete(key);
            throw t;
        }
    }
}

// 使用
@Idempotent(timeout = 10, message = "订单创建中，请勿重复提交")
@PostMapping("/api/orders")
public Order createOrder(@RequestBody OrderRequest request) {
    return orderService.create(request);
}
```

**安全清单：**

| 类别 | 措施 | 优先级 |
|------|------|--------|
| **传输安全** | 全站 HTTPS，HSTS 头部 | 🔴 必须 |
| **认证** | BCrypt 密码哈希，JWT 签名验证 | 🔴 必须 |
| **授权** | RBAC 权限模型，接口级 + 数据级 | 🔴 必须 |
| **输入验证** | 参数校验，SQL 参数化，XSS 过滤 | 🔴 必须 |
| **CSRF** | 前后端分离可禁用，传统表单必须开启 | 🟡 视场景 |
| **CORS** | 精确配置允许的域名，不要用 `*` | 🟡 视场景 |
| **限流** | Nginx/网关限流 + 应用层限流 | 🟡 推荐 |
| **日志脱敏** | 密码、身份证、手机号脱敏 | 🟡 推荐 |
| **审计** | 关键操作审计日志 | 🟡 推荐 |
| **依赖安全** | 定期扫描依赖漏洞（OWASP Dependency-Check） | 🟡 推荐 |
