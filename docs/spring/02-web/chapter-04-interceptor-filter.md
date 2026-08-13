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

---
*待补充：更多拦截器场景*
