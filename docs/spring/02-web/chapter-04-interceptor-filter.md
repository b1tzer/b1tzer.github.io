# 拦截器与过滤器

## 1. Filter vs Interceptor

| 特性 | Filter | Interceptor |
|------|--------|-------------|
| 规范 | Servlet | Spring MVC |
| 作用范围 | 所有请求 | 只拦截 Controller |
| 顺序 | @Order | Order接口 |

## 2. 自定义拦截器

```java
@Component
public class AuthInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String token = request.getHeader("Authorization");
        if (!validateToken(token)) {
            response.setStatus(401);
            return false;
        }
        return true;
    }
}
```

## 3. 文件上传

```java
@PostMapping("/upload")
public String upload(@RequestParam("file") MultipartFile file) {
    file.transferTo(new File("/uploads/" + file.getOriginalFilename()));
    return "success";
}
```

## 4. 拦截器实战

### 4.1 请求耗时拦截器

```java
@Component
public class RequestDurationInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RequestDurationInterceptor.class);

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute("startTime", System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
            Object handler, Exception ex) {
        long startTime = (long) request.getAttribute("startTime");
        long duration = System.currentTimeMillis() - startTime;
        String uri = request.getRequestURI();
        int status = response.getStatus();

        if (duration > 1000) {
            log.warn("慢请求: {} {} 耗时 {}ms 状态码 {}", request.getMethod(), uri, duration, status);
        } else {
            log.info("请求: {} {} 耗时 {}ms 状态码 {}", request.getMethod(), uri, duration, status);
        }
    }
}
```

### 4.2 接口限流拦截器

```java
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiter rateLimiter = RateLimiter.create(100); // 100 QPS

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!rateLimiter.tryAcquire(50, TimeUnit.MILLISECONDS)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"code\":429,\"message\":\"请求过于频繁\"}");
            return false;
        }
        return true;
    }
}
```

### 4.3 拦截器注册与排序

```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired
    private AuthInterceptor authInterceptor;

    @Autowired
    private RequestDurationInterceptor durationInterceptor;

    @Autowired
    private RateLimitInterceptor rateLimitInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // 1. 耗时统计（最先执行）
        registry.addInterceptor(durationInterceptor)
            .addPathPatterns("/api/**")
            .order(0);

        // 2. 限流
        registry.addInterceptor(rateLimitInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/health")
            .order(1);

        // 3. 鉴权
        registry.addInterceptor(authInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/auth/**", "/api/health")
            .order(2);
    }
}
```

### 4.4 Filter 与 Interceptor 执行顺序

```text
请求进入
    │
    ▼
Filter-1.doFilter()
    │
    ▼
Filter-2.doFilter()
    │
    ▼
DispatcherServlet
    │
    ├── Interceptor-1.preHandle()
    ├── Interceptor-2.preHandle()
    │
    ├── Controller 方法执行
    │
    ├── Interceptor-2.postHandle()
    ├── Interceptor-1.postHandle()
    │
    ├── 视图渲染
    │
    ├── Interceptor-2.afterCompletion()
    └── Interceptor-1.afterCompletion()
    │
    ▼
Filter-2.doFilter() 返回
    │
    ▼
Filter-1.doFilter() 返回
```

**关键区别：** Filter 在 DispatcherServlet 之外，可以修改请求体；Interceptor 在 DispatcherServlet 之内，可以访问 Handler 信息。

**最佳实践：**

1. **用 Filter 做通用处理**——编码、CORS、GZIP 压缩、MDC 注入
2. **用 Interceptor 做业务处理**——鉴权、日志、限流
3. **拦截器执行顺序**通过 `order()` 方法控制，值越小越先执行
4. **`afterCompletion` 中不要抛异常**——它在视图渲染后执行，异常不会被全局异常处理捕获
